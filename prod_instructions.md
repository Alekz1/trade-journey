1. Pull the latest Code
sudo -u tradeapp bash
cd /var/www/tradejournal
git pull
2. Update backend Code
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart tradejournal-api
3. Update frontend Code
cd ../frontend
npm install
npm run build
sudo systemctl restart nginx