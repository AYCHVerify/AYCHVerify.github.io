import React, { Component } from 'react';
import './styles/Validator.scss';
import { Container, Table, TableHead, TableRow, TableCell, TableBody, Button, Grid, Modal, CircularProgress, AppBar, Toolbar, Box, TextField, LinearProgress } from "@material-ui/core";
import { observer } from "mobx-react"
import { observable } from "mobx"
import { UserSession, AppConfig } from "blockstack"
import { IFile, convertSizeToString } from "./Classes";
import axios from "axios";
// IconSet
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
    @observable validFiles: IFile[] = [];
    @observable files: IFile[] = [];
    importedFiles: File[] = [];
    @observable loading: boolean = false;
    @observable disabledInput: boolean = false;
    @observable processed = 0;
    @observable title?: string;
    mutex: Promise<void> = Promise.resolve();
    @observable hasWrong: boolean = false;
    @observable verifyCount: number = 0;

    componentDidMount() {
        this.loading = true;
        let info = JSON.parse(Buffer.from(window.location.hash.substr(1), "base64").toString());
        axios.get(info.hubURL + "links/" + info.name, { responseType: "arraybuffer" }).then((e) => {
            window.crypto.subtle
                .importKey("raw", new Uint8Array(Buffer.from(info.key, "hex")), "AES-CBC", true, ["decrypt"])
                .then(decKey => {
                    return window.crypto.subtle.decrypt(
                        {
                            name: "AES-CBC",
                            iv: new Uint8Array(Buffer.from(info.iv, "hex"))
                        },
                        decKey,
                        e.data
                    );
                }).then((e) => {
                    let data = JSON.parse(Buffer.from(e).toString());
                    console.log(data);
                    this.title = data.title;
                    this.validFiles = data.files;
                    console.log(this.validFiles);
                    for (let i = 0; i < this.validFiles.length; i++) {
                        this.validFiles[i].state = "queue";
                    }
                    this.loading = false;                    
                });
        });
    }

    handleFileDrop(e: React.DragEvent<HTMLDivElement>) {
        e.preventDefault();
        e.stopPropagation();
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
                    for (let i = 0; i < this.validFiles.length; i++) {
                        if (this.files[idx].hash == this.validFiles[i].hash) {
                            this.files[idx].state = "done";
                            if (this.validFiles[i].state != "done")
                                this.verifyCount++;
                            this.validFiles[i].state = "done";
                            break;
                        }
                    }
                    if (this.files[idx].state != "done") {
                        this.files[idx].state = "failed";
                        this.hasWrong = true;
                    }
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
    handleDragEvent(e: React.DragEvent<HTMLDivElement>) {
        e.stopPropagation();
        e.preventDefault();
    }
    handleAddFile() {
        let input = document.getElementById("select_files") as HTMLInputElement;
        input.click();
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
            <div id="validator">
                <nav className="navbar">
                    <div className="container">
                        <div className="navbar-logo">
                            <img
                                src={verifyBarLogo}
                                alt="VerifyBar Logo"
                                srcSet={`${verifyBarLogo} 1x, ${verifyBarLogo2x} 2x`}
                            />
                        </div>
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
                            <div style={{ width: 300 }}>
                                <div className="toolbar-title subtitle-2">{this.title}</div>
                            <div className="toolbar-counter subtitle-3">{this.verifyCount} of {this.validFiles.length} files verified</div>
                                <div className="linier-progressbar">
                                <span className="progressbar" style={{ width: this.verifyCount * 100.0 / this.validFiles.length + '%' }}></span>
                                </div>
                            </div>
                            <button className="toolbar-buttons add-file button-2" onClick={this.handleAddFile.bind(this)}>Add Files</button>
                        </div>

                        {/* Verified Table */}
                        <div className="drop-block subtitle-3">
                            <p className="drop-title overline">Verifing files</p>
                            <div className="drop-table-block" style={{ minHeight: this.validFiles.length === 0 ? "" : "auto" }}>
                                <div className="drop-placeholder" style={{ display: this.validFiles.length === 0 ? "block" : "none" }}>Drop files here to start hash generation.</div>
                                <div className="table" style={{ display: this.validFiles.length === 0 ? "none" : "flex", width: "100%", maxHeight: "100%", overflow: "auto" }}>
                                    <div className="table-row head">
                                        <span className="status-cell">status</span>
                                        <span className="name-cell">FileName</span>
                                        <span className="size-cell">Size</span>
                                        <span className="hash-cell">Hash</span>
                                    </div>

                                    {this.files.map((row, index) => (
                                        <React.Fragment>
                                            {row.state == "processing" && <div className="table-row" key={index}>
                                                <span className="status-cell">
                                                    <div className="checking">
                                                        <img src={waitingIcon} alt="Waiting icon" srcSet={`${waitingIcon} 1x, ${waitingIcon2x} 2x`} />
                                                        <p className="subtitle-3">Checking</p>
                                                    </div>
                                                </span>
                                                <span className="name-cell">{row.name}</span>
                                                <span className="size-cell">{convertSizeToString(row.size)}</span>
                                                <span className="status-cell">{row.hash}</span>
                                            </div>}
                                        </React.Fragment>
                                    ))}

                                    {this.validFiles.map((row, index) => (
                                        <React.Fragment>
                                            {(row.state == "done" || row.state == "queue") && <div className="table-row" key={index} style={{ color: row.state == "done" ? '#090f0fde' : '' }}>
                                                <span className="status-cell">{row.state == "done" ?
                                                    <div className="verified">
                                                        <img src={verifiedIcon} alt="Done icon" srcSet={`${verifiedIcon} 1x, ${verifiedIcon2x} 2x`} />
                                                        <p className="subtitle-3">Verified</p>
                                                    </div> :
                                                    <div className="checking">    
                                                        
                                                    </div>}
                                                </span>
                                                <span className="name-cell">{row.name}</span>
                                                <span className="size-cell">{convertSizeToString(row.size)}</span>
                                                <span className="status-cell">{row.hash}</span>
                                            </div>}
                                        </React.Fragment>
                                    ))}

                                </div>
                            </div>
                        </div>

                        {/* Warning Table */}
                        {this.hasWrong && <div className="drop-block warning-block wrong subtitle-3">
                            <p className="drop-title overline">Wrong files</p>
                            <div className="drop-table-block" style={{ minHeight: this.validFiles.length === 0 ? "" : "auto" }}>
                                <div className="drop-placeholder" style={{ display: this.validFiles.length === 0 ? "block" : "none" }}>Drop files here to start hash generation.</div>
                                <div className="table" style={{ display: this.validFiles.length === 0 ? "none" : "flex", width: "100%", maxHeight: "100%", overflow: "auto" }}>
                                    <div className="table-row head">
                                        <span className="status-cell">status</span>
                                        <span className="name-cell">FileName</span>
                                        <span className="size-cell">Size</span>
                                        <span className="hash-cell">Hash</span>
                                    </div>
                                    {this.files.map((row, index) => (
                                        <React.Fragment>
                                            {row.state == "failed" && <div className="table-row" key={index}>
                                                <span className="status-cell">{row.state == "failed" &&
                                                    <div className="warning">
                                                        <img src={wrongIcon} alt="Done icon" srcSet={`${wrongIcon} 1x, ${wrongIcon2x} 2x`} />
                                                        <p className="subtitle-3">Wrong</p>
                                                    </div>}
                                                </span>
                                                <span className="name-cell">{row.name}</span>
                                                <span className="size-cell">{convertSizeToString(row.size)}</span>
                                                <span className="status-cell">{row.hash}</span>
                                            </div>}
                                        </React.Fragment>
                                    ))}
                                </div>

                            </div>
                        </div>}

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
                <input id="clipboard_input" type="text" style={{ position: "absolute", left: -99999999, top: -9999999 }} />
                <input id="select_files" type="file" onChange={this.handleFileChanged.bind(this)} multiple style={{ display: "none" }} />
            </div>
        );
    }
}