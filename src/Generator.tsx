import React, { Component } from 'react';
import './styles/Generator.scss';
import './styles/_text-style.scss';
import { Container, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, Modal, CircularProgress, AppBar, Toolbar, Box, TextField, LinearProgress } from "@material-ui/core";
import { observer } from "mobx-react"
import { observable } from "mobx"
import { UserSession, AppConfig } from "blockstack"
import { IFile, convertSizeToString } from "./Classes";
import CheckIcon from '@material-ui/icons/Check';
// iconSet
import verifyBarLogo from "./assets/verifybar_logo.png";
import verifyBarLogo2x from "./assets/verifybar_logo_2x.png";
import verifiedIcon from "./assets/verified_20px.png";
import verifiedIcon2x from "./assets/verified_20px_2x.png";
import waitingIcon from "./assets/waiting_20px.png";
import waitingIcon2x from "./assets/waiting_20px_2x.png";
import wrongIcon from "./assets/wrong_20px.png";
import wrongIcon2x from "./assets/wrong_20px_2x.png";

export interface Props { }

export interface State { }

@observer
export default class Generator extends Component<Props, State> {
    @observable files: IFile[] = [];
    importedFiles: File[] = [];
    @observable loading: boolean = false;
    @observable disabledInput: boolean = false;
    @observable processed = 0;
    name = Buffer.from(window.crypto.getRandomValues(new Uint8Array(4))).toString("hex");
    key = window.crypto.getRandomValues(new Uint8Array(32));
    iv = window.crypto.getRandomValues(new Uint8Array(16));
    title?: string;
    userSession: UserSession;
    appConfig: AppConfig;
    clipboard?: Clipboard;
    mutex: Promise<void> = Promise.resolve();
    constructor(props: any) {
        super(props);
        this.appConfig = new AppConfig();
        this.userSession = new UserSession({ appConfig: this.appConfig });
        if (this.userSession.isSignInPending()) {
            this.userSession.handlePendingSignIn().then((e) => {
                window.location.href = window.location.origin;
            });
        }
    }

    handleLogin() {
        this.userSession.redirectToSignIn(window.location.origin, window.location.origin + "/manifest.json", ["store_write", "publish_data", "email"]);
    }

    handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
        if (this.disabledInput)
            return;
        for (let i = 0; i < e.dataTransfer.files.length; i++) {
            if (e.dataTransfer.files[i].size == 0) continue;
            this.importedFiles.push(e.dataTransfer.files[i]);
            this.files.push({ name: e.dataTransfer.files[i].name, size: e.dataTransfer.files[i].size, hash: "", state: "queue" });
        }
        this.processFile(0);
    }
    processFile(idx: number) {
        while (idx < this.files.length && this.files[idx].state != "queue")
            idx++;
        if (idx >= this.files.length) {
            return;
        }
        this.files[idx].state = "processing";
        let reader = new FileReader();
        reader.onloadend = (e: ProgressEvent) => {
            if (e.target) {
                window.crypto.subtle.digest("SHA-256", (e.target as EventTarget & { result: ArrayBuffer }).result).then((e) => {
                    this.files[idx].hash = Buffer.from(e).toString("hex");
                    this.files[idx].state = "done";
                    this.processed++;
                    this.processFile(idx + 1);
                });
            }
        }
        reader.onerror = (e) => {
            this.files[idx].state = "error";
        }
        reader.readAsArrayBuffer(this.importedFiles[idx]);
    }
    handleCreateLink() {
        if (this.disabledInput) {
            let userData = this.userSession.loadUserData();
            if (!userData.gaiaHubConfig) {
                return;
            }
            let input = document.getElementById("clipboard_input") as HTMLInputElement;
            if (input) {
                input.value = window.location.origin + "/validator#" + Buffer.from(JSON.stringify({ name: this.name, hubURL: userData.gaiaHubConfig.url_prefix + userData.gaiaHubConfig.address + "/", iv: Buffer.from(this.iv).toString("hex"), key: Buffer.from(this.key).toString("hex") })).toString("base64");
                input.select();
                document.execCommand("copy");
                alert("Link copied to clipboard.");
            }
        } else {
            this.loading = true;

            console.log(this.title);

            window.crypto.subtle
                .importKey("raw", new Uint8Array(this.key), "AES-CBC", true, ["encrypt"])
                .then(decKey => {
                    return window.crypto.subtle.encrypt(
                        {
                            name: "AES-CBC",
                            iv: new Uint8Array(this.iv)
                        },
                        decKey,
                        Buffer.from(JSON.stringify({ files: this.files, title: this.title })).buffer
                    );
                }).then((e) => {
                    this.userSession.putFile(`links/${this.name}`, Buffer.from(e), { encrypt: false }).then(() => {
                        this.disabledInput = true;
                        let input = document.getElementById("clipboard_input") as HTMLInputElement;
                        let userData = this.userSession.loadUserData();
                        if (input && userData && userData.gaiaHubConfig) {
                            input.value = window.location.origin + "/validator#" + Buffer.from(JSON.stringify({ name: this.name, hubURL: userData.gaiaHubConfig.url_prefix + userData.gaiaHubConfig.address + "/", iv: Buffer.from(this.iv).toString("hex"), key: Buffer.from(this.key).toString("hex") })).toString("base64");
                        }
                        this.loading = false;
                    });
                });
        }
    }
    handleLogout() {
        this.userSession.signUserOut();
        window.location.href = window.location.origin;
    }
    handleDragEvent(e: React.DragEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();
    }
    handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        this.title = (e.target as HTMLInputElement).value;
    }
    handleDeleteLink() {
        if (this.disabledInput) {
            this.loading = true;
            this.userSession.deleteFile(`links/${this.name}`).then(() => {
                window.location.reload();
            }).catch(() => {
                window.location.reload();
            });
        } else {
            let input = document.getElementById("select_files") as HTMLInputElement;
            input.click();
        }
    }
    handleFileChanged(e: React.ChangeEvent<HTMLInputElement>) {
        let input = document.getElementById("select_files") as HTMLInputElement;
        if (!input.files)
            return;
        e.preventDefault();
        e.stopPropagation();
        if (this.disabledInput)
            return;
        for (let i = 0; i < input.files.length; i++) {
            if (input.files[i].size == 0) continue;
            this.importedFiles.push(input.files[i]);
            this.files.push({ name: input.files[i].name, size: input.files[i].size, hash: "", state: "queue" });
        }
        this.processFile(0);
    }
    render() {
        return (
            <div id="generator">
                <nav className="navbar">
                    <div className="container">
                        <div className="navbar-logo">
                            <img
                                src={verifyBarLogo}
                                alt="VerifyBar Logo"
                                srcSet={`${verifyBarLogo} 1x, ${verifyBarLogo2x} 2x`}
                            />
                        </div>
                        {this.userSession.isUserSignedIn() ? <button className="navbar-button link-2" onClick={this.handleLogout.bind(this)}>Log out</button> : <button className="navbar-button link-2" onClick={this.handleLogin.bind(this)}>Log in</button>}
                    </div>
                </nav>

                <div className="home">
                    <div className="container"
                        onDragOver={this.handleDragEvent.bind(this)}
                        onDrag={this.handleDragEvent.bind(this)}
                        onDragStart={this.handleDragEvent.bind(this)}
                        onDragEnd={this.handleDragEvent.bind(this)}
                        onDragEnter={this.handleDragEvent.bind(this)}
                        onDragLeave={this.handleDragEvent.bind(this)}
                        onDrop={this.handleFileDrop.bind(this)}
                    >
                        <div className="toolbar">
                            <div>
                                <input
                                    className="toolbar-input body-2"
                                    disabled={this.disabledInput}
                                    placeholder="Verify title"
                                    onChange={this.handleTitleChange.bind(this)}
                                />
                                {/* <div>{this.processed} of {this.files.length}</div>
                                <LinearProgress variant="determinate" value={this.processed * 100.0 / this.files.length} /> */}
                            </div>
                            <div>
                                <button className="toolbar-buttons add-file button-2" onClick={this.handleDeleteLink.bind(this)}>
                                    {this.disabledInput ? " Delete and disable link " : " Add Files "}
                                </button>
                                <input id="clipboard_input" className="body-2" type="text" style={{ display: this.disabledInput ? 'inline-block' : 'none' }} />
                                <button className="toolbar-buttons save-and-copy button-2" onClick={this.handleCreateLink.bind(this)} disabled={this.files.length === 0 || !this.userSession.isUserSignedIn()}>
                                    {this.disabledInput ? " Copy Link " : "Save and copy link"}
                                </button>
                            </div>
                        </div>


                        <div className="drop-block subtitle-3">
                            <p className="drop-title overline">Verifing files</p>
                            <div className="drop-table-block" style={{ minHeight: this.files.length === 0 ? "" : "auto" }}>
                                <div className="drop-placeholder" style={{ display: this.files.length === 0 ? "block" : "none" }}>Drop files here to start hash generation.</div>
                                <div className="table" style={{ display: this.files.length === 0 ? "none" : "flex", width: "100%", maxHeight: "100%", overflow: "auto" }}>

                                    <div className="table-row head">
                                        <span className="status-cell">status</span>
                                        <span className="name-cell">FileName</span>
                                        <span className="size-cell">Size</span>
                                        <span className="hash-cell">Hash</span>
                                    </div>

                                    {this.files.map((row, index) => (
                                        <div className="table-row" key={index} style={{ color: row.state == "done" ? '#090f0fde' : '' }}>
                                            <span className="status-cell">{row.state == "done" ?
                                                <div className="verified">
                                                    <img src={verifiedIcon} alt="Done icon" srcSet={`${verifiedIcon} 1x, ${verifiedIcon2x} 2x`} />
                                                    <p className="subtitle-3">Done</p>
                                                </div>
                                                : <div className="checking">
                                                    <img src={waitingIcon} alt="Waiting icon" srcSet={`${waitingIcon} 1x, ${waitingIcon2x} 2x`} />
                                                    <p className="subtitle-3">Checking</p>
                                                </div>}</span>
                                            <span className="name-cell">{row.name}</span>
                                            <span className="size-cell">{convertSizeToString(row.size)}</span>
                                            <span className="status-cell">{row.hash}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <Modal open={this.loading}>
                            <Grid container
                                direction="row"
                                justify="center"
                                alignItems="center"
                                style={{ height: "100%" }}
                            >
                                <CircularProgress color="secondary"></CircularProgress>
                            </Grid>
                        </Modal>
                    </div>
                </div>

                <footer className="footer">
                    <div className="container">
                        <p className="copyright caption">©2019 Dadroit Co. All Rights Reserved.</p>
                        <div className="social-links">
                            <a href="https://www.producthunt.com/posts/verifybar" className="link-2">Support us in Product Hunt</a>
                            <a href="mailto:hi@dadroit.com" className="link-2">Contact</a>
                            <a href="https://twitter.com/DadroitGroup" className="link-2">Twitter</a>
                        </div>
                    </div>
                </footer>
                {/* <input id="clipboard_input" type="text" style={{ position: "absolute", left: -99999999, top: -9999999 }} /> */}
                <input id="select_files" type="file" onChange={this.handleFileChanged.bind(this)} multiple style={{ display: "none" }} />
            </div>
        );
    }
}