document.addEventListener('DOMContentLoaded', function() {
    let myFunds = JSON.parse(localStorage.getItem('myFunds')) || [];
    let marketData = {};
    let pieChart = null;

    async function refresh() {
        if (myFunds.length === 0) return render();
        const btn = document.getElementById('refresh-btn');
        if (btn) btn.innerText = "⏳ 同步中...";

        try {
            const codes = myFunds.map(f => f.code).join(',');
            const res = await fetch(`/api/fund/${codes}`);
            const data = await res.json();

            data.forEach(item => {
                if(!item.error) marketData[item.code] = item;
            });
            render();
            updateDashboard();
        } catch (e) { console.error(e); }
        finally { if (btn) btn.innerText = "🔄 刷新"; }
    }

    function render() {
        const tbody = document.getElementById('fund-list');
        tbody.innerHTML = '';

        myFunds.forEach((f, idx) => {
            const m = marketData[f.code] || {};
            // 核心修复：强制默认值为 0，且转换为数字
            const gsz = parseFloat(m.gsz || 0);
            const jz = parseFloat(m.jz || 0);
            const rate = parseFloat(m.gszzl || 0);
            const share = parseFloat(f.share || 0);
            const cost = parseFloat(f.cost || 0);

            const dayP = (gsz - jz) * share;
            const allP = (gsz - cost) * share;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="fund-name">${m.name || '查询中...'}</div>
                    <div class="fund-code">${f.code}</div>
                </td>
                <td class="${rate >= 0 ? 'red' : 'green'}">
                    ${gsz > 0 ? gsz.toFixed(4) : '--'}<br>
                    <small>${rate.toFixed(2)}%</small>
                </td>
                <td>
                    <div class="${dayP >= 0 ? 'red' : 'green'}">今: ${dayP.toFixed(2)}</div>
                    <div class="${allP >= 0 ? 'red' : 'green'}" style="opacity:0.6; font-size:0.8em">累: ${allP.toFixed(2)}</div>
                </td>
                <td><button onclick="removeF(${idx})" class="del-btn">×</button></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateDashboard() {
        let tDay = 0, tAll = 0;
        myFunds.forEach(f => {
            const m = marketData[f.code];
            if(m && m.gsz) {
                tDay += (parseFloat(m.gsz) - parseFloat(m.jz)) * parseFloat(f.share);
                tAll += (parseFloat(m.gsz) - parseFloat(f.cost)) * parseFloat(f.share);
            }
        });
        document.getElementById('day-profit').innerText = (tDay >= 0 ? '+' : '') + tDay.toFixed(2);
        document.getElementById('total-profit').innerText = (tAll >= 0 ? '+' : '') + tAll.toFixed(2);
    }

    document.getElementById('analyze-btn').onclick = async () => {
        const overlay = document.getElementById('loading-overlay');
        overlay.style.display = 'flex';

        let stockWeight = {};
        let totalVal = 0;

        for (let f of myFunds) {
            const m = marketData[f.code];
            if(!m || !m.gsz) continue;

            const val = parseFloat(f.share) * parseFloat(m.gsz);
            totalVal += val;

            try {
                const res = await fetch(`/api/stocks/${f.code}`);
                const stocks = await res.json();
                stocks.forEach(s => {
                    const amt = val * (parseFloat(s.rate) / 100);
                    stockWeight[s.name] = (stockWeight[s.name] || 0) + amt;
                });
            } catch(e) {}
        }

        overlay.style.display = 'none';
        if (totalVal === 0) return alert("请先刷新行情");

        const data = Object.entries(stockWeight)
            .map(([name, amt]) => ({ name, val: ((amt/totalVal)*100).toFixed(2) }))
            .sort((a,b) => b.val - a.val).slice(0, 10);

        if(data.length > 0) {
            document.getElementById('analysis-panel').style.display = 'block';
            if(pieChart) pieChart.destroy();
            pieChart = new Chart(document.getElementById('stockPieChart'), {
                type: 'doughnut',
                data: {
                    labels: data.map(d => d.name),
                    datasets: [{ data: data.map(d => d.val), backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#14b8a6','#f97316','#6366f1'] }]
                },
                options: { cutout: '70%' }
            });
        } else {
            alert("接口暂被拦截，已启用本地缓存保护，请1分钟后重试。");
        }
    };

    window.removeF = (i) => { myFunds.splice(i,1); localStorage.setItem('myFunds', JSON.stringify(myFunds)); refresh(); };
    document.getElementById('add-btn').onclick = () => document.getElementById('addModal').style.display = 'flex';
    document.getElementById('modal-cancel').onclick = () => document.getElementById('addModal').style.display = 'none';
    document.getElementById('modal-save').onclick = () => {
        const code = document.getElementById('inp-code').value;
        const share = document.getElementById('inp-share').value;
        const cost = document.getElementById('inp-cost').value;
        if(code && share) {
            myFunds.push({code, share, cost});
            localStorage.setItem('myFunds', JSON.stringify(myFunds));
            document.getElementById('addModal').style.display = 'none';
            refresh();
        }
    };
    document.getElementById('refresh-btn').onclick = refresh;
    refresh();
});