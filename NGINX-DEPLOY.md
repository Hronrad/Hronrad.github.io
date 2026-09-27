# Nginx 网站自动部署指南

适用于当前 `Hronrad/Hronrad.github.io` 静态网站项目。配置完成后，每次推送 `main`，GitHub Actions 都会先运行测试，再通过 SSH 和 rsync 同步网站文件。

本文假设服务器使用 Ubuntu/Debian、SSH 端口为 `22`，网站部署到 `/var/www/hronrad/site`。请将示例中的“服务器IP”替换为真实公网 IP。

## 1. 准备服务器

使用现有管理员账号登录服务器，执行：

```bash
sudo apt-get update
sudo apt-get install -y rsync

sudo useradd --create-home --shell /bin/bash deploy

sudo mkdir -p /var/www/hronrad/site
sudo chown deploy:deploy /var/www/hronrad/site
sudo chmod 755 /var/www /var/www/hronrad /var/www/hronrad/site

sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
sudo touch /home/deploy/.ssh/authorized_keys
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

如果 `deploy` 账号已存在，跳过创建账号的命令。该账号不需要 sudo 权限，只需有网站目录的写入权限。

服务器的安全组、防火墙和 SSH 服务需要允许 GitHub Actions 部署连接。若 SSH 仅允许固定来源 IP，则需要额外配置可达的部署通道，不能直接假设 GitHub 托管 runner 可以连接。

## 2. 在本机生成部署密钥

在 Mac 终端执行。如果同名密钥已存在，请使用其他文件名，避免覆盖。

```bash
ssh-keygen -t ed25519 \
  -C "github-actions-hronrad" \
  -f ~/.ssh/hronrad_deploy \
  -N ""
```

生成两个文件：

- `~/.ssh/hronrad_deploy`：私钥，稍后存入 GitHub Secrets。
- `~/.ssh/hronrad_deploy.pub`：公钥，添加到服务器。

在本机查看公钥：

```bash
cat ~/.ssh/hronrad_deploy.pub
```

在服务器打开以下文件，将公钥整行追加进去并保存，不要覆盖已有公钥：

```bash
sudo nano /home/deploy/.ssh/authorized_keys
```

然后在本机测试登录：

```bash
ssh -i ~/.ssh/hronrad_deploy deploy@服务器IP
```

确认可以登录后，执行 `exit` 返回本机。

## 3. 配置 GitHub Secrets

打开仓库 `Hronrad/Hronrad.github.io`，进入：

`Settings → Secrets and variables → Actions → New repository secret`

添加以下三个 Secrets：

| 名称 | 内容 |
| --- | --- |
| `DEPLOY_HOST` | 服务器公网 IP，不含协议前缀和端口 |
| `DEPLOY_SSH_KEY` | 本机 `~/.ssh/hronrad_deploy` 的完整内容，包含 BEGIN 和 END 行 |
| `DEPLOY_KNOWN_HOSTS` | 下文说明的服务器主机身份记录 |

通过已可信的服务器终端读取 SSH 主机公钥：

```bash
sudo cat /etc/ssh/ssh_host_ed25519_key.pub
```

将服务器 IP 和公钥组合成一行，作为 `DEPLOY_KNOWN_HOSTS` 的值：

```text
服务器IP ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA……
```

IP 必须与 `DEPLOY_HOST` 一致。这里填写的是服务器 SSH 主机公钥，不是第 2 步生成的部署公钥。

私钥只存入 GitHub Secrets，不要提交到代码仓库。

## 4. 添加自动部署工作流

在项目根目录新建 `.github/workflows/deploy.yml`，内容如下：

```yaml
name: Deploy website

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: nginx-production
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v6
        with:
          persist-credentials: false

      - name: Setup Node
        uses: actions/setup-node@v6
        with:
          node-version: '24'

      - name: Run tests
        run: |
          node --check app.js
          node --check CA.js
          node --check ham/ham.js
          node --check responsive-shell.js
          node --test tests/ca-engine.test.cjs tests/responsive-shell.test.cjs

      - name: Configure SSH
        env:
          SSH_KEY: ${{ secrets.DEPLOY_SSH_KEY }}
          KNOWN_HOSTS: ${{ secrets.DEPLOY_KNOWN_HOSTS }}
        run: |
          install -d -m 700 ~/.ssh
          printf '%s\n' "$SSH_KEY" > ~/.ssh/deploy_key
          printf '%s\n' "$KNOWN_HOSTS" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/deploy_key ~/.ssh/known_hosts

      - name: Sync website
        env:
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
        run: |
          rsync -az \
            --no-owner --no-group \
            --chmod=D755,F644 \
            --delay-updates \
            --delete-delay \
            --exclude='.git/' \
            --exclude='.github/' \
            --exclude='.agents/' \
            --exclude='.codex/' \
            --exclude='.vscode/' \
            --exclude='.DS_Store' \
            --exclude='.gitignore' \
            --exclude='.env*' \
            --exclude='.well-known/' \
            --exclude='node_modules/' \
            --exclude='tests/' \
            --exclude='README.md' \
            --exclude='AGENTS.md' \
            --exclude='NGINX-DEPLOY.md' \
            -e "ssh -i $HOME/.ssh/deploy_key -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=20" \
            ./ "deploy@${DEPLOY_HOST}:/var/www/hronrad/site/"

      - name: Remove deployment key
        if: always()
        run: rm -f ~/.ssh/deploy_key
```

配置的行为：

- 推送 `main` 时自动部署，也可在 Actions 页面手动触发。
- 测试失败时停止，不执行同步。
- 同一个部署组不会并行执行，部署中的任务不会因新推送而被取消。
- 同步普通网站文件，排除 Git 元数据、测试、部署文档等内容。
- 删除仓库中已移除的对应网站文件；排除的 `.well-known` 目录会保留。

> `/var/www/hronrad/site` 必须是这个网站的专用目录，不要在其中保存数据库、日志、证书或其他网站文件。`--delete-delay` 会删除目标目录中源端不存在且未被排除的文件。此方案采用文件同步，并非整站原子切换；需要严格无中间状态发布时，应改用版本目录与软链接切换。

在本机项目目录提交并推送工作流：

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: deploy website to nginx on push"
git push origin main
```

进入 GitHub 仓库的 `Actions → Deploy website` 查看运行日志。首次部署成功后，再修改 Nginx 根目录，避免切换到空目录。

## 5. 配置 Nginx 网站目录

编辑当前域名对应的 Nginx `server` 配置，将网站根目录设置为：

```nginx
root /var/www/hronrad/site;
index index.html;
```

当前项目的普通静态页面可以使用以下路由规则：

```nginx
location / {
    try_files $uri $uri/ =404;
}
```

如果已有 `location /`，修改原有配置，不要重复添加。保留已有的域名、HTTPS 证书、证书验证和其他必要配置。确保现有子级配置没有另外设置 `root` 或 `alias` 而覆盖该目录。

在服务器验证并加载：

```bash
sudo nginx -t && sudo systemctl reload nginx
```

如果使用宝塔安装 Nginx，可在宝塔的网站设置中修改网站目录，再通过面板重载配置；其二进制路径和服务管理方式可能与系统安装不同。

仅这次修改 Nginx 配置需要重载，后续更新静态文件通常不需要重启或重载 Nginx。

## 6. 验证自动更新

1. 修改一处页面文字并推送到 `main`。
2. 查看 GitHub Actions，确认测试和同步步骤均成功。
3. 刷新线上首页与 `/ham/` 页面，确认新内容可见。

如 Actions 成功但仍看到旧页面，先强制刷新浏览器；使用 CDN 时，还需要刷新相应页面的 CDN 缓存。

## 常见问题

| 现象 | 检查方法 |
| --- | --- |
| `Permission denied (publickey)` | 检查部署公钥是否写入 `deploy` 的 `authorized_keys`、文件权限是否正确，以及 GitHub 私钥是否完整 |
| `Host key verification failed` | 检查 `DEPLOY_KNOWN_HOSTS` 中的 IP、公钥是否与服务器匹配，不要通过关闭主机验证来绕过 |
| SSH 连接超时 | 检查公网 IP、SSH 端口、安全组、防火墙和来源 IP 限制 |
| rsync 提示无写入权限 | 检查 `/var/www/hronrad/site` 及其中已有文件是否允许 `deploy` 写入 |
| Nginx 返回 403 | 检查 `index.html` 是否存在，Nginx 用户是否能读取文件并遍历父目录 |
| Nginx 返回 404 | 检查当前域名实际匹配的 `server`、`root` 和 `location` 配置 |
| Actions 成功但页面没变化 | 检查 Nginx 是否指向部署目录，并清理浏览器或 CDN 缓存 |

### SSH 使用非 22 端口

假设端口是 `2222`，需要同时修改：

1. 本机测试：`ssh -p 2222 -i ~/.ssh/hronrad_deploy deploy@服务器IP`。
2. 工作流中 rsync 的 SSH 命令加入 `-p 2222`。
3. `DEPLOY_KNOWN_HOSTS` 的主机部分改为 `[服务器IP]:2222`：

```text
[服务器IP]:2222 ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA……
```

## 官方参考

- [GitHub Actions Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)
- [GitHub Actions 工作流触发器](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)
- [Nginx 入门与静态文件配置](https://nginx.org/en/docs/beginners_guide.html)
- [Nginx 配置检查与命令行参数](https://nginx.org/en/docs/switches.html)
