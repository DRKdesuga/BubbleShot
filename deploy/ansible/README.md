# BubbleShot VM Provisioning (Ansible)

This playbook provisions a Debian/Ubuntu VM so BubbleShot can run in a production-like setup:

- Node.js runtime
- Nginx reverse proxy
- WireGuard client configuration (`wg-quick@wg0`)
- Repository clone to `/opt/bubbleshot`
- Backend build + systemd service
- Frontend build served by Nginx from `/var/www/bubbleshot`
- Health checks (`/healthz` and `/api/health`)

## 1) Prepare inventory

```bash
cp deploy/ansible/inventory.example.ini deploy/ansible/inventory.ini
```

Edit `deploy/ansible/inventory.ini` with your VM IP and SSH user.

## 2) Set required variables

Edit:

- `deploy/ansible/group_vars/all.yml`

At minimum, update:

- `bubbleshot_repo_url`
- `bubbleshot_repo_version`
- `bubbleshot_wg_private_key`
- `bubbleshot_wg_address`
- `bubbleshot_wg_peers[*].public_key`
- `bubbleshot_wg_peers[*].endpoint`
- `bubbleshot_db_host_primary`
- `bubbleshot_db_host_standby`
- `bubbleshot_db_name`
- `bubbleshot_db_user`
- `bubbleshot_db_password`

## 3) Run playbook

```bash
ansible-playbook -i deploy/ansible/inventory.ini deploy/ansible/playbook.yml --become
```

If you use an SSH key:

```bash
ansible-playbook -i deploy/ansible/inventory.ini deploy/ansible/playbook.yml --become --private-key ~/.ssh/<your-key>
```

## 4) Verify on VM

```bash
curl -i http://127.0.0.1/healthz
curl -i http://127.0.0.1/api/health
sudo systemctl status bubbleshot-backend --no-pager
sudo systemctl status nginx --no-pager
sudo systemctl status wg-quick@wg0 --no-pager
sudo wg show
```

## Notes

- The backend service start command supports both `dist/main.js` and `dist/src/main.js`.
- The backend service is configured to start after WireGuard when `bubbleshot_wireguard_enabled: true`.
- If your repository is private, ensure the VM/user has GitHub access (SSH key/token).
