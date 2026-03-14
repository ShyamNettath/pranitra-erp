import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
import subprocess
import threading
import json
import os
import sys
import paramiko

CONFIG_FILE = os.path.join(os.path.dirname(os.path.abspath(sys.executable if getattr(sys, 'frozen', False) else __file__)), "deploy_config.json")

DEFAULT_CONFIG = {
    "ssh_host": "erp.pranitra.com",
    "ssh_user": "root",
    "ssh_port": "22",
    "ssh_key_path": "",
    "ssh_password": "",
    "server_repo_path": "/var/www/usaha-erp",
    "local_repo_path": "C:\\ERP\\pranitra",
    "use_key": True
}

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            cfg = json.load(f)
            for k, v in DEFAULT_CONFIG.items():
                cfg.setdefault(k, v)
            return cfg
    return DEFAULT_CONFIG.copy()

def save_config(cfg):
    with open(CONFIG_FILE, "w") as f:
        json.dump(cfg, f, indent=2)

class DeployApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("USAHA ERP — Deploy to GitHub & Server")
        self.resizable(False, False)
        self.configure(bg="#003264")
        self.cfg = load_config()
        self._build_ui()
        self._center()

    def _center(self):
        self.update_idletasks()
        w, h = self.winfo_width(), self.winfo_height()
        sw, sh = self.winfo_screenwidth(), self.winfo_screenheight()
        self.geometry(f"+{(sw-w)//2}+{(sh-h)//2}")

    def _build_ui(self):
        # Header
        hdr = tk.Frame(self, bg="#003264", pady=12)
        hdr.pack(fill="x")
        tk.Label(hdr, text="USAHA ERP", font=("Arial", 18, "bold"), bg="#003264", fg="white").pack()
        tk.Label(hdr, text="One-Click Deploy — GitHub + DigitalOcean", font=("Arial", 9), bg="#003264", fg="#aac4e8").pack()

        # Main card
        card = tk.Frame(self, bg="white", padx=20, pady=16)
        card.pack(fill="both", expand=True, padx=2, pady=2)

        # Commit message
        tk.Label(card, text="Commit Message", font=("Arial", 10, "bold"), bg="white", anchor="w").pack(fill="x")
        self.commit_var = tk.StringVar(value="Update code")
        commit_entry = tk.Entry(card, textvariable=self.commit_var, font=("Arial", 10), relief="solid", bd=1)
        commit_entry.pack(fill="x", pady=(2, 10))

        # Local repo path
        tk.Label(card, text="Local Repo Path", font=("Arial", 10, "bold"), bg="white", anchor="w").pack(fill="x")
        self.local_path_var = tk.StringVar(value=self.cfg.get("local_repo_path", ""))
        tk.Entry(card, textvariable=self.local_path_var, font=("Arial", 9), relief="solid", bd=1).pack(fill="x", pady=(2, 10))

        # Separator
        ttk.Separator(card, orient="horizontal").pack(fill="x", pady=4)

        # Settings toggle
        self.show_settings = tk.BooleanVar(value=False)
        toggle_btn = tk.Checkbutton(card, text="⚙  Show Server Settings", variable=self.show_settings,
                                     command=self._toggle_settings, font=("Arial", 9),
                                     bg="white", fg="#003264", activebackground="white",
                                     cursor="hand2")
        toggle_btn.pack(anchor="w")

        self.settings_frame = tk.Frame(card, bg="#f5f7fa", bd=1, relief="solid", padx=12, pady=10)

        # Settings fields
        fields = [
            ("SSH Host", "ssh_host"),
            ("SSH User", "ssh_user"),
            ("SSH Port", "ssh_port"),
            ("Server Repo Path", "server_repo_path"),
        ]
        self.cfg_vars = {}
        for label, key in fields:
            row = tk.Frame(self.settings_frame, bg="#f5f7fa")
            row.pack(fill="x", pady=2)
            tk.Label(row, text=label, font=("Arial", 9), bg="#f5f7fa", width=18, anchor="w").pack(side="left")
            var = tk.StringVar(value=self.cfg.get(key, ""))
            tk.Entry(row, textvariable=var, font=("Arial", 9), relief="solid", bd=1).pack(side="left", fill="x", expand=True)
            self.cfg_vars[key] = var

        # Auth method
        auth_row = tk.Frame(self.settings_frame, bg="#f5f7fa")
        auth_row.pack(fill="x", pady=(8, 2))
        tk.Label(auth_row, text="Auth Method", font=("Arial", 9), bg="#f5f7fa", width=18, anchor="w").pack(side="left")
        self.use_key_var = tk.BooleanVar(value=self.cfg.get("use_key", True))
        tk.Radiobutton(auth_row, text="SSH Key", variable=self.use_key_var, value=True,
                       bg="#f5f7fa", font=("Arial", 9), command=self._toggle_auth).pack(side="left")
        tk.Radiobutton(auth_row, text="Password", variable=self.use_key_var, value=False,
                       bg="#f5f7fa", font=("Arial", 9), command=self._toggle_auth).pack(side="left")

        self.key_row = tk.Frame(self.settings_frame, bg="#f5f7fa")
        self.key_row.pack(fill="x", pady=2)
        tk.Label(self.key_row, text="SSH Key Path", font=("Arial", 9), bg="#f5f7fa", width=18, anchor="w").pack(side="left")
        self.ssh_key_var = tk.StringVar(value=self.cfg.get("ssh_key_path", ""))
        tk.Entry(self.key_row, textvariable=self.ssh_key_var, font=("Arial", 9), relief="solid", bd=1).pack(side="left", fill="x", expand=True)
        tk.Label(self.key_row, text="(e.g. C:\\Users\\you\\.ssh\\id_rsa)", font=("Arial", 8), bg="#f5f7fa", fg="grey").pack(side="left", padx=4)

        self.pass_row = tk.Frame(self.settings_frame, bg="#f5f7fa")
        self.pass_row.pack(fill="x", pady=2)
        tk.Label(self.pass_row, text="SSH Password", font=("Arial", 9), bg="#f5f7fa", width=18, anchor="w").pack(side="left")
        self.ssh_pass_var = tk.StringVar(value=self.cfg.get("ssh_password", ""))
        tk.Entry(self.pass_row, textvariable=self.ssh_pass_var, show="*", font=("Arial", 9), relief="solid", bd=1).pack(side="left", fill="x", expand=True)

        tk.Button(self.settings_frame, text="Save Settings", command=self._save_settings,
                  bg="#003264", fg="white", font=("Arial", 9, "bold"),
                  relief="flat", padx=10, pady=4, cursor="hand2").pack(anchor="e", pady=(8, 0))

        self._toggle_auth()

        # Log area
        tk.Label(card, text="Deploy Log", font=("Arial", 10, "bold"), bg="white", anchor="w").pack(fill="x", pady=(10, 2))
        self.log = scrolledtext.ScrolledText(card, height=12, font=("Courier", 9), bg="#1a1a2e",
                                              fg="#cccccc", relief="solid", bd=1, state="disabled")
        self.log.pack(fill="x")
        self.log.tag_config("ok", foreground="#00cc66")
        self.log.tag_config("err", foreground="#E8232A")
        self.log.tag_config("info", foreground="#aac4e8")
        self.log.tag_config("step", foreground="#ffffff")

        # Deploy button
        self.deploy_btn = tk.Button(card, text="🚀  DEPLOY NOW", command=self._start_deploy,
                                     bg="#E8232A", fg="white", font=("Arial", 13, "bold"),
                                     relief="flat", pady=10, cursor="hand2", activebackground="#c01020")
        self.deploy_btn.pack(fill="x", pady=(12, 0))

        # Footer
        tk.Label(self, text="© NEUK NET-TECH   |   erp.pranitra.com",
                 font=("Arial", 8), bg="#1A1A2E", fg="#cccccc", pady=5).pack(fill="x")

    def _toggle_settings(self):
        if self.show_settings.get():
            self.settings_frame.pack(fill="x", pady=(4, 8))
        else:
            self.settings_frame.pack_forget()

    def _toggle_auth(self):
        if self.use_key_var.get():
            self.key_row.pack(fill="x", pady=2)
            self.pass_row.pack_forget()
        else:
            self.pass_row.pack(fill="x", pady=2)
            self.key_row.pack_forget()

    def _save_settings(self):
        for key, var in self.cfg_vars.items():
            self.cfg[key] = var.get().strip()
        self.cfg["ssh_key_path"] = self.ssh_key_var.get().strip()
        self.cfg["ssh_password"] = self.ssh_pass_var.get().strip()
        self.cfg["use_key"] = self.use_key_var.get()
        save_config(self.cfg)
        messagebox.showinfo("Saved", "Settings saved successfully.")

    def _log(self, msg, tag="info"):
        self.log.config(state="normal")
        self.log.insert("end", msg + "\n", tag)
        self.log.see("end")
        self.log.config(state="disabled")

    def _start_deploy(self):
        commit_msg = self.commit_var.get().strip()
        local_path = self.local_path_var.get().strip()
        if not commit_msg:
            messagebox.showwarning("Missing", "Enter a commit message.")
            return
        if not local_path:
            messagebox.showwarning("Missing", "Enter the local repo path.")
            return
        self.cfg["local_repo_path"] = local_path
        save_config(self.cfg)
        self.deploy_btn.config(state="disabled", text="Deploying...")
        self.log.config(state="normal")
        self.log.delete("1.0", "end")
        self.log.config(state="disabled")
        threading.Thread(target=self._deploy, args=(commit_msg, local_path), daemon=True).start()

    def _run_local(self, cmd, cwd):
        result = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, shell=True)
        return result.returncode, result.stdout.strip(), result.stderr.strip()

    def _deploy(self, commit_msg, local_path):
        try:
            # --- STEP 1: Git Add ---
            self._log("\n── STEP 1: Git Add ──────────────────", "step")
            rc, out, err = self._run_local("git add .", local_path)
            if rc != 0:
                self._log(f"✗ git add failed: {err}", "err"); self._done(False); return
            self._log("✓ git add .", "ok")

            # --- STEP 2: Git Commit ---
            self._log("\n── STEP 2: Git Commit ───────────────", "step")
            rc, out, err = self._run_local(f'git commit -m "{commit_msg}"', local_path)
            if rc != 0 and "nothing to commit" not in out and "nothing to commit" not in err:
                self._log(f"✗ git commit failed: {err}", "err"); self._done(False); return
            if "nothing to commit" in out or "nothing to commit" in err:
                self._log("ℹ  Nothing new to commit — pushing existing HEAD", "info")
            else:
                self._log(f"✓ Committed: {commit_msg}", "ok")

            # --- STEP 3: Git Push ---
            self._log("\n── STEP 3: Git Push ─────────────────", "step")
            rc, out, err = self._run_local("git push", local_path)
            if rc != 0:
                self._log(f"✗ git push failed: {err}", "err"); self._done(False); return
            self._log("✓ Pushed to GitHub", "ok")

            # --- STEP 4: SSH Deploy ---
            self._log("\n── STEP 4: Deploy to Server ─────────", "step")
            self._log(f"  Connecting to {self.cfg['ssh_host']}...", "info")

            ssh = paramiko.SSHClient()
            ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

            connect_kwargs = {
                "hostname": self.cfg["ssh_host"],
                "port": int(self.cfg.get("ssh_port", 22)),
                "username": self.cfg["ssh_user"],
                "timeout": 30
            }
            if self.cfg.get("use_key") and self.cfg.get("ssh_key_path"):
                connect_kwargs["key_filename"] = self.cfg["ssh_key_path"]
            elif self.cfg.get("ssh_password"):
                connect_kwargs["password"] = self.cfg["ssh_password"]
            else:
                self._log("✗ No SSH auth method configured. Open Settings and add key or password.", "err")
                self._done(False); return

            ssh.connect(**connect_kwargs)
            self._log("✓ SSH connected", "ok")

            repo = self.cfg.get("server_repo_path", "/var/www/usaha-erp")
            deploy_cmd = (
                f"cd {repo} && "
                f"git pull origin main && "
                f"docker compose up --build -d 2>&1"
            )
            self._log(f"  Running: {deploy_cmd}", "info")
            _, stdout, stderr = ssh.exec_command(deploy_cmd, timeout=300)

            for line in stdout:
                self._log("  " + line.rstrip(), "info")
            exit_code = stdout.channel.recv_exit_status()
            ssh.close()

            if exit_code != 0:
                self._log(f"✗ Server deploy exited with code {exit_code}", "err")
                self._done(False); return

            self._log("✓ Server updated & containers restarted", "ok")
            self._log("\n✅  DEPLOY COMPLETE — erp.pranitra.com is live", "ok")
            self._done(True)

        except Exception as e:
            self._log(f"✗ ERROR: {e}", "err")
            self._done(False)

    def _done(self, success):
        self.deploy_btn.config(state="normal", text="🚀  DEPLOY NOW")
        if success:
            messagebox.showinfo("Done", "Deploy completed successfully!\n\nerp.pranitra.com is live.")
        else:
            messagebox.showerror("Failed", "Deploy failed. Check the log for details.")

if __name__ == "__main__":
    app = DeployApp()
    app.mainloop()
