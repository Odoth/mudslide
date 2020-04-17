import { Terminal, ITheme } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

import { IoEvent } from "../common/ioevent";

import { Telnet } from "./telnetlib";
import * as util from "./util";

import * as io from "socket.io-client";

const theme: ITheme = {
    cursor: "rgb(0,0,0)",

    background: "rgb(0,0,0)",
    foreground: "rgb(0,187,0)",

    black: "rgb(0,0,0)",
    red: "rgb(187,0,0)",
    green: "rgb(0,187,0)",
    yellow: "rgb(187,187,0)",
    blue: "rgb(0,0,187)",
    magenta: "rgb(187,0,187)",
    cyan: "rgb(0,187,187)",
    white: "rgb(192,192,192)",

    brightBlack: "rgb(128,128,128)",
    brightRed: "rgb(256,0,0)",
    brightGreen: "rgb(0,256,0)",
    brightYellow: "rgb(256,256,0)",
    brightBlue: "rgb(0,0,256)",
    brightMagenta: "rgb(256,0,256)",
    brightCyan: "rgb(0,256,256)",
    brightWhite: "rgb(256,256,256)"
};


export namespace mudslide {

    
    export function Init() {
        let term = new Terminal({
            theme: theme,
            cursorStyle: "bar",
            cursorWidth: 0,
            fontSize: 13,
            fontFamily: 'courier-new, courier, monospace',
        });
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        let elem = document.getElementById('terminal');
        if (null === elem) {
            console.error("Didn't find terminal element");
            return;
        }
        term.open(elem);
        fitAddon.fit();

        (() => {
            let resizeTimer: any = null;
            window.addEventListener("resize", (ev) => {
                console.info("resize event");
                if (resizeTimer !== null) {
                    clearTimeout(resizeTimer);
                }
                resizeTimer = setTimeout(() => {
                    resizeTimer = null;
                    fitAddon.fit();
                });
            });
        })();

        let ioConn = io.connect(
            location.protocol + "//" +
            document.domain +
            ":" +
            location.port +
            "/telnet");

        ioConn.on("connect", () => {
            term.writeln("\x1b[1;36m[[Websocket connected]]\x1b[0m");
        });

        ioConn.on("disconnect", () => {
           term.writeln("\x1b[1;36m[[Websocket disconnected]]\x1b[0m");
        });

        let ioEvt = new IoEvent(ioConn);

        let tn: Telnet | null = null;

        ioEvt.srvTelnetOpened.handle(() => {
            tn = new Telnet((data) => {
                ioEvt.clReqTelnetWrite.fire(data);
            });

            tn.EvtData.handle((data) => {
                let arr = new Uint8Array(data);
                term.write(arr);
            });

            term.writeln("\x1b[1;36m[[Telnet connected]]\x1b[0m");
        });

        ioEvt.srvTelnetClosed.handle(() => {
            tn = null;
            term.writeln("\x1b[1;36m[[Telnet disconnected]]\x1b[0m");
        });
        
        ioEvt.srvTelnetData.handle((d) => {
            tn?.handleData(d);
        });

        let hostParam: string | undefined = util.getUrlParameter("host");
        let portParam: string | undefined = util.getUrlParameter("port");

        if (hostParam === undefined || portParam === undefined)
        {
            console.error("host or port not found");
            return;
        }

        let host = hostParam.trim();
        let port = Number(portParam);
        ioEvt.clReqTelnetOpen.fire([host, port]);

        let cmdInput = document.getElementById("cmdInput") as HTMLInputElement;
        cmdInput.addEventListener("keydown", (ev: KeyboardEvent) => {
            if (ev.key === "Enter") {
                term.writeln("\x1b[1;33m" + cmdInput.value + "\x1b[0m");
                sendCmd(cmdInput.value);
                cmdInput.select();
                return false;
            }

            return true;
        });

        function sendCmd(cmd: string) {
            cmd += "\r\n";
            let arr = util.utf8encode(cmd);
            ioEvt.clReqTelnetWrite.fire(arr.buffer);
        }
    }
} // namespace mudslide