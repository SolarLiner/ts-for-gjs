import * as xml2js from "xml2js"
import * as lodash from "lodash"
import * as commander from "commander"
import fs = require("fs")
import { GirModule } from "./girModule"
import { MapType, InheritanceTable } from "./types"

function exportGjs(outDir: string | null, girModules: { [key: string]: any }) {
  if (!outDir) return

  fs.createWriteStream(`${outDir}/Gjs.d.ts`).write(
    `export namespace byteArray {
    export class ByteArray {
        constructor(len: number)
        toGBytes(): any  // GLib.Bytes?
        length: number
    }
    export function fromString(input: string): ByteArray
    export function fromArray(input: number[]): ByteArray
    export function fromGBytes(input: any): ByteArray
    export function toString(x: ByteArray): string
}
export namespace console {
    export function interact(): void
}
export namespace Lang {
    // TODO: There is a lot more in Lang
    export function Class(props: any): void
}
export namespace gettext {
    export enum LocaleCategory {
        ALL, COLLATE, CTYPE, MESSAGES, MONETARY, NUMERIC, TIME
    }
    export function setlocale(category: number, locale: string|null): string
    export function textdomain(domainname: string|null): string
    export function bindtextdomain(domainname: string, dirname: string|null): string
    export function gettext(msgid: string): string
    export function dgettext(domainname: string|null, msgid: string): string
    export function dcgettext(domainname: string|null, msgid: string, category: number): string
    export function ngettext(msgid: string, msgid_plural: string, n: number): string
    export function dngettext(domainname: string, msgid: string, msgid_plural: string, n: number): string
    export function domain(domainName: string): { gettext: ((msgid: string) => string), ngettext: ((msgid: string, msgid_plural: string, n:number) => string), pgettext: ((context: any, msgid: string) => any) }
}
export namespace Format {
    export function vprintf(str: string, args: string[]): string
    export function printf(fmt: string, ...args: any[]): void
    // Following docs from gjs/modules/format.js
    /**
     * This function is intended to extend the String object and provide
     * an String.format API for string formatting.
     * It has to be set up using String.prototype.format = Format.format;
     * Usage:
     * "somestring %s %d".format('hello', 5);
     * It supports %s, %d, %x and %f, for %f it also support precisions like
     * "%.2f".format(1.526). All specifiers can be prefixed with a minimum
     * field width, e.g. "%5s".format("foo"). Unless the width is prefixed
     * with '0', the formatted string will be padded with spaces.
     */
    export function format(fmt: string, ...args: any[]): string
}
export namespace Mainloop {
    export function quit(name: string): void
    export function idle_source(handler: any, priority: number): any
    export function idle_add(handler: any, priority: number): any
    export function timeout_source(timeout: any, handler: any, priority: number): any
    export function timeout_seconds_source(timeout: any, handler: any, priority: number): any
    export function timeout_add(timeout: any, handler: any, priority: number): any
    export function timeout_add_seconds(timeout: any, handler: any, priority: number): any
    export function source_remove(id: any): any
    export function run(name: string): void
}
`
  )

  fs.createWriteStream(`${outDir}/Gjs.js`).write(
    `module.exports = {
    byteArray: imports.byteArray,
    Lang: imports.lang,
    Format: imports.format,
    Mainloop: imports.mainloop,
    gettext: imports.gettext
}`
  )

  const keys = lodash.keys(girModules).map(key => key.split("-")[0])

  // Breaks dependent app with error TS2383 if directly in global.
  // https://github.com/Microsoft/TypeScript/issues/16430
  fs.createWriteStream(`${outDir}/print.d.ts`).write(`declare function print(...args: any[]): void`)

  fs.createWriteStream(`${outDir}/index.js`).write("")

  fs.createWriteStream(`${outDir}/index.d.ts`).write(
    `/// <reference path="print.d.ts" />

import * as Gjs from "./Gjs";
${keys.map(key => `import * as ${key} from "./${key}";`).join("\n")}

declare global {
    function printerr(...args: any[]): void
    function log(message?: string): void
    function logError(exception: any, message?: string): void
    const ARGV: string[]
    const imports: typeof Gjs & {
        [key: string]: any
        gi: {
${keys.map(key => `            ${key}: typeof ${key}`).join("\n")}
        }
        searchPath: string[]
    }
}

export { }`
  )
}

function exportExtra(outDir: string | null, inheritanceTable: Record<string, any[]>) {
  if (!outDir) return

  let def: string[] = []
  def.push("import * as GObject from './GObject'")
  def.push("")
  def.push("let inheritanceTable = {")
  for (let k of lodash.keys(inheritanceTable)) {
    let arr: string = "'" + inheritanceTable[k].join("', '") + "'"
    def.push(`    '${k}': [ ${arr} ],`)
  }
  def.push("}")
  def.push("")

  def.push(`
interface StaticNamed {
    name: string
}

/** Casts between derived classes, performing a run-time type-check
 * and raising an exception if the cast fails. Allows casting to implemented
 * interfaces, too.
 */
export function giCast<T>(from_: GObject.Object, to_: StaticNamed): T {
    let desc: string = from_.toString()
    let clsName: string|null = null
    for (let k of desc.split(" ")) {
        if (k.substring(0, 7) == "GIName:") {
            clsName = k.substring(7)
            break
        }
    }
    let toName = to_.name.replace("_", ".")

    if (toName === clsName)
        return ((from_ as any) as T)

    if (clsName) {
        let parents = inheritanceTable[clsName]
        if (parents) {
            if (parents.indexOf(toName) >= 0)
                return ((from_ as any) as T)
        }
    }

    throw Error("Invalid cast of " + desc + "(" + clsName + ") to " + toName)
}
`)

  fs.createWriteStream(`${outDir}/cast.ts`).write(def.join("\n"))
}

function finaliseInheritance<T>(inheritanceTable: InheritanceTable<T>) {
  for (let clsName of lodash.keys(inheritanceTable)) {
    let p = inheritanceTable[clsName][0]
    while (p) {
      p = inheritanceTable[p]
      if (p) {
        p = p[0]
        inheritanceTable[clsName].push(p)
      }
    }
  }
}

function main() {
  commander
    .option("-g --gir-directory [directory]", "GIR directory", "/usr/share/gir-1.0")
    .option(
      "-m --module [module]",
      "GIR modules to load, e.g. 'Gio-2.0'. May be specified multiple " + "times",
      (val, lst) => {
        lst.push(val)
        return lst
      },
      []
    )
    .option("-o --outdir [dir]", "Directory to output to", null)
    .parse(process.argv)

  let girModules: Record<string, GirModule> = {}
  let girDirectory = commander.girDirectory
  let girToLoad = commander.module

  if (girToLoad.length == 0) {
    console.error("Need to specify modules via -m!")
    return
  }

  while (girToLoad.length > 0) {
    let name = girToLoad.shift()
    let fileName = `${girDirectory}/${name}.gir`
    console.log(`Parsing ${fileName}...`)
    let fileContents = fs.readFileSync(fileName, "utf8")
    xml2js.parseString(fileContents, (err, result) => {
      if (err) {
        console.error("ERROR: " + err)
        return
      }
      let gi = new GirModule(result)

      if (!gi.name) return

      girModules[`${gi.name}-${gi.version}`] = gi

      for (let dep of gi.dependencies) {
        if (!girModules[dep] && lodash.indexOf(girToLoad, dep) < 0) {
          girToLoad.unshift(dep)
        }
      }
    })
  }

  //console.dir(girModules["GObject-2.0"], { depth: null })

  console.log("Files parsed, loading types...")

  let symTable: MapType<any> = {}
  for (let k of lodash.values(girModules)) k.loadTypes(symTable)

  let inheritanceTable: Record<string, string[]> = {}
  for (let k of lodash.values(girModules)) k.loadInheritance(inheritanceTable)
  finaliseInheritance(inheritanceTable)

  //console.dir(inheritanceTable)

  // Figure out transitive module dependencies
  let modDependencyMap: Record<string, string[]> = {}

  for (let k of lodash.values(girModules)) {
    modDependencyMap[k.name || "-"] = lodash.map(k.dependencies || [], (val: string) => {
      return val.split("-")[0]
    })
  }

  let traverseDependencies = (name: string | null, ret: object) => {
    if (name === null) throw new Error("name is not defined")
    let deps = modDependencyMap[name]

    for (let a of deps) {
      if (ret[a]) continue
      ret[a] = 1
      traverseDependencies(a, ret)
    }
  }

  for (let k of lodash.values(girModules)) {
    let ret = {}
    traverseDependencies(k.name, ret)
    k.transitiveDependencies = lodash.keys(ret)
  }

  let patch = {
    "Atk.Object.get_description": [
      "/* return type clashes with Atk.Action.get_description */",
      "get_description(): string | null"
    ],
    "Atk.Object.get_name": ["/* return type clashes with Atk.Action.get_name */", "get_name(): string | null"],
    "Atk.Object.set_description": [
      "/* return type clashes with Atk.Action.set_description */",
      "set_description(description: string): boolean | null"
    ],
    "Gtk.Container.child_notify": ["/* child_notify clashes with Gtk.Widget.child_notify */"],
    "Gtk.MenuItem.activate": ["/* activate clashes with Gtk.Widget.activate */"],
    "Gtk.TextView.get_window": ["/* get_window clashes with Gtk.Widget.get_window */"],
    "WebKit.WebView.get_settings": ["/* get_settings clashes with Gtk.Widget.get_settings */"]
  }

  console.log("Types loaded, generating .d.ts...")

  for (let k of lodash.keys(girModules)) {
    let outf: NodeJS.WritableStream = process.stdout
    if (commander.outdir) {
      let outdir: string = commander.outdir
      let name: string = girModules[k].name || "unknown"
      let fileName: string = `${outdir}/${name}.d.ts`
      outf = fs.createWriteStream(fileName)
    }
    console.log(` - ${k} ...`)
    girModules[k].patch = patch
    girModules[k].export(outf)

    if (commander.outdir) {
      let outdir: string = commander.outdir
      let name: string = girModules[k].name || "unknown"
      let fileName: string = `${outdir}/${name}.js`
      outf = fs.createWriteStream(fileName)
    }

    girModules[k].exportJs(outf)
  }

  mkdirp(commander.outdir)
    .then(() => {
      // GJS internal stuff
      exportGjs(commander.outdir, girModules)
      exportExtra(commander.outdir, inheritanceTable)

      console.log("Done.")
    })
    .catch(err => console.error(err))
}

async function mkdirp(dir: string) {
  return new Promise<void>((resolve, reject) => {
    fs.exists(dir, e => {
      if (e) resolve()
      else {
        fs.mkdir(dir, { recursive: true }, err => {
          if (err) reject(err)
          else resolve()
        })
      }
    })
  })
}

if (require.main === module) main()
