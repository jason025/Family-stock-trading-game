let players = [];
let currentPlayerIndex = 0;
let stocks = [
    { name: 'A股', price: 100, feature: '稳定型，每回合小幅波动（-5%到+5%）' },
    { name: 'B股', price: 100, feature: '高风险高回报，大幅波动（-20%到+20%）' },
    { name: 'C股', price: 100, feature: '波动型，随机波动（-15%到+15%），<br>有10%概率大涨或大跌（-30%到+30%）' }
];
let round = 0;
let totalRounds = 10;
const MINIMUM_BALANCE = 100;
let canInvest = false;
let investmentCount = 0;
let BLACK_SWAN_PROBABILITY = 0.05;
let ECONOMIC_CRISIS_PROBABILITY = 0.03;
let PREDICTION_ACCURACY = 0.7;
let canRollDice = true;
let initialFunds = 10000;
let isEconomicCrisis = false;
let stockPriceHistory = {
    'A股': [],
    'B股': [],
    'C股': []
};
let stockChart;

Chart.register(ChartDataLabels);

function addPlayer() {
    clearGameState(); // 清除之前的游戏状态
    const playerName = prompt('请输入玩家姓名：');
    if (playerName) {
        players.push({ name: playerName, money: initialFunds, stocks: {}, lastProfit: 0, lastReward: 0, extraInvestment: 0 });
        updatePlayersDisplay();
    }
}

function updatePlayersDisplay() {
    const playersDiv = document.getElementById('players');
    playersDiv.innerHTML = players.map(player => 
        `<p>${player.name}: ${player.money}元</p>`
    ).join('');
}

function startGame() {
    totalRounds = parseInt(document.getElementById('totalRoundsInput').value) || 10; // 使用设置中的值
    if (loadGameState()) {
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('setupArea').style.display = 'none';
        updateStockMarket();
        updatePlayerMoney();
        updateCurrentPlayer();
        updateRoundInfo();
        document.getElementById('nextTurnButton').disabled = false;
        canInvest = false; // 加载游戏后，需要先掷骰子
        updateButtons();
    } else if (players.length < 1) {
        alert('请至少添加一名玩！');
        return;
    } else {
        document.getElementById('gameArea').style.display = 'block';
        document.getElementById('setupArea').style.display = 'none';
        updateStockMarket();
        updatePlayerMoney();
        updateCurrentPlayer();
        updateRoundInfo();
        document.getElementById('nextTurnButton').disabled = true;
        canInvest = false; // 新游戏开始，需要先掷骰子
        investmentCount = 0;
        updateButtons();
    }
    document.getElementById('startGameButton').disabled = true;
    initializeStockPriceHistory();
    createStockChart();
}

function updateStockMarket() {
    const stockMarket = document.getElementById('stockMarket');
    stockMarket.innerHTML = `
        <tr>
            <th>股票</th>
            <th>前价格</th>
            <th>特点</th>
        </tr>
        ${stocks.map(stock => `
            <tr>
                <td>${stock.name}</td>
                <td>${stock.price.toFixed(2)}元</td>
                <td class="stock-feature">${stock.feature}</td>
            </tr>
        `).join('')}
    `;

    const stockSelect = document.getElementById('stockSelect');
    stockSelect.innerHTML = stocks.map(stock => 
        `<option value="${stock.name}">${stock.name}</option>`
    ).join('');
}

function updatePlayerMoney() {
    const playerMoneyTable = document.getElementById('playerMoney');
    playerMoneyTable.innerHTML = `
        <tr>
            <th>玩家</th>
            <th>剩余资金</th>
            <th>本次盈亏</th>
            <th>奖励</th>
        </tr>
        ${players.map(player => `
            <tr>
                <td>${player.name}</td>
                <td>${player.money.toFixed(2)}元</td>
                <td class="${player.lastProfit > 0 ? 'profit' : player.lastProfit < 0 ? 'loss' : ''}">
                    ${player.lastProfit > 0 ? '+' : ''}${player.lastProfit.toFixed(2)}元
                </td>
                <td>${player.lastReward ? '+' + player.lastReward.toFixed(2) + '元' : '-'}</td>
            </tr>
        `).join('')}
    `;
}

function updateCurrentPlayer() {
    const currentPlayerDiv = document.getElementById('currentPlayer');
    const player = players[currentPlayerIndex];
    currentPlayerDiv.innerHTML = `
        <h3>当前玩家：<span class="current-player-name">${player.name}</span></h3>
        <p>资金：${player.money.toFixed(2)}元</p>
        <p>持股：${Object.entries(player.stocks).map(([stock, amount]) => 
            `${stock}: ${amount}股`
        ).join(', ')}</p>
    `;
}

function rollDice() {
    if (!canRollDice) {
        alert('本轮已经掷过子，请进行投资或进入下一回合！');
        return;
    }

    // 使用 Math.random() 和 Math.floor() 生成 1 到 6 之间的随机整数
    const diceResult = Math.floor(Math.random() * 6) + 1;
    
    // 使用 switch 语句来确保每个数字都有相应的表情
    let diceEmoji;
    switch(diceResult) {
        case 1: diceEmoji = '⚀'; break;
        case 2: diceEmoji = '⚁'; break;
        case 3: diceEmoji = '⚂'; break;
        case 4: diceEmoji = '⚃'; break;
        case 5: diceEmoji = '⚄'; break;
        case 6: diceEmoji = '⚅'; break;
    }
    
    document.getElementById('dice').textContent = diceEmoji;
    
    const player = players[currentPlayerIndex];
    let resultMessage = '';
    let reward = 0;
    let stockReward = 0;

    switch (diceResult) {
        case 1:
            resultMessage = `获得1000元现金奖励！`;
            reward = 1000;
            break;
        case 2:
            const randomStock = stocks[Math.floor(Math.random() * stocks.length)];
            const freeShareValue = randomStock.price;
            player.stocks[randomStock.name] = (player.stocks[randomStock.name] || 0) + 1;
            resultMessage = `免费获得一股 ${randomStock.name}，当前价值 ${freeShareValue.toFixed(2)}元`;
            stockReward = freeShareValue;
            break;
        case 3:
            resultMessage = `获得额外投资机会！本轮可以进行两次投资。`;
            player.extraInvestment = 1;
            break;
        case 4:
            resultMessage = `所有股票价格上涨5%！`;
            stocks.forEach(stock => {
                const oldPrice = stock.price;
                stock.price *= 1.05;
                const playerShares = player.stocks[stock.name] || 0;
                if (playerShares > 0) {
                    const profitFromRise = playerShares * (stock.price - oldPrice);
                    stockReward += profitFromRise;
                    resultMessage += `<br>${stock.name}：从 ${oldPrice.toFixed(2)}元 涨到 ${stock.price.toFixed(2)}元`;
                    if (playerShares > 0) {
                        resultMessage += `，您持有 ${playerShares} 股，增值 ${profitFromRise.toFixed(2)}元`;
                    }
                }
            });
            updateStockMarket();
            break;
        case 5:
            resultMessage = `获得下一轮股价变化预测的机会！`;
            break;
        case 6:
            resultMessage = `获得所有股票各一股！`;
            stocks.forEach(stock => {
                player.stocks[stock.name] = (player.stocks[stock.name] || 0) + 1;
                stockReward += stock.price;
                resultMessage += `<br>${stock.name}：获得1股，价值 ${stock.price.toFixed(2)}元`;
            });
            resultMessage += `<br>总价值：${stockReward.toFixed(2)}元`;
            break;
    }

    player.money += reward + stockReward;
    player.lastReward = reward;
    player.lastProfit = stockReward;

    resultMessage += `<br><br>总收益：${(reward + stockReward).toFixed(2)}元`;
    if (reward > 0) resultMessage += `（包括现金奖励 ${reward.toFixed(2)}元）`;
    if (stockReward > 0) resultMessage += `（包括股票收益 ${stockReward.toFixed(2)}元）`;

    document.getElementById('diceResult').innerHTML = `骰子点数：${diceResult}<br>${resultMessage}`;
    updatePlayerMoney();
    updateCurrentPlayer();
    investmentCount = 0;
    canRollDice = false;
    canInvest = true;
    updateButtons();

    // 如果骰子结果是5，显示股价预测
    if (diceResult === 5) {
        const nextPrices = stocks.map(stock => ({
            name: stock.name,
            currentPrice: stock.price,
            predictedPrice: predictNextPrice(stock)
        }));
        let predictionMessage = '下一轮预测：<br>' + nextPrices.map(s => 
            `${s.name}: 当前 ${s.currentPrice.toFixed(2)}元, 预测 ${s.predictedPrice.toFixed(2)}元 (${((s.predictedPrice / s.currentPrice - 1) * 100).toFixed(2)}%)`
        ).join('<br>');
        predictionMessage += `<br><br>预测准确率约为 ${(PREDICTION_ACCURACY * 100).toFixed(0)}%，请谨慎参考。`;
        document.getElementById('investmentResult').innerHTML = predictionMessage;
    } else {
        document.getElementById('investmentResult').innerHTML = '';
    }
}

function predictNextPrice(stock) {
    let actualChange;
    switch(stock.name) {
        case 'A股':
            actualChange = Math.random() * 0.1 - 0.05; // -5% 到 +5%
            break;
        case 'B股':
            actualChange = Math.random() * 0.4 - 0.2; // -20% 到 +20%
            break;
        case 'C股':
            if (Math.random() < 0.1) {
                actualChange = Math.random() * 0.6 - 0.3; // -30% 到 +30%
            } else {
                actualChange = Math.random() * 0.3 - 0.15; // -15% 到 +15%
            }
            break;
    }
    
    // 引入预测偏差
    const predictionError = (Math.random() * 2 - 1) * (1 - PREDICTION_ACCURACY) * actualChange;
    const predictedChange = actualChange + predictionError;
    
    return stock.price * (1 + predictedChange);
}

function invest() {
    if (!canInvest) {
        alert('本轮投资次数已用完，请进入下一回合！');
        return;
    }

    const player = players[currentPlayerIndex];
    const stockName = document.getElementById('stockSelect').value;
    const amount = parseInt(document.getElementById('amount').value);

    if (isNaN(amount) || amount % 100 !== 0 || amount <= 0) {
        alert('请输入100的正整倍！');
        return;
    }

    if (amount > player.money) {
        alert('资金不足！');
        return;
    }

    const stock = stocks.find(s => s.name === stockName);
    const sharesBought = Math.floor(amount / stock.price);

    if (sharesBought === 0) {
        alert(`投资金额不足以购买一股${stockName}，请增加购买金额。`);
        return;
    }

    const initialInvestment = sharesBought * stock.price;
    player.money -= initialInvestment;
    player.stocks[stockName] = (player.stocks[stockName] || 0) + sharesBought;

    const initialStockPrice = stock.price;
    updateStockPrices();
    const newStockPrice = stocks.find(s => s.name === stockName).price;
    const newValue = sharesBought * newStockPrice;

    player.lastProfit = newValue - initialInvestment;
    player.money += newValue;

    updateCurrentPlayer();
    updatePlayerMoney();
    updateStockMarket();

    let resultMessage = `
        ${player.name} 购买了 ${sharesBought} 股 ${stockName}<br>
        初始股价：${initialStockPrice.toFixed(2)}元<br>
        初始投资：${sharesBought} × ${initialStockPrice.toFixed(2)} = ${initialInvestment.toFixed(2)}元<br>
        新股价：${newStockPrice.toFixed(2)}元<br>
        当前价值：${sharesBought} × ${newStockPrice.toFixed(2)} = ${newValue.toFixed(2)}元<br>
        盈亏计算：${newValue.toFixed(2)} - ${initialInvestment.toFixed(2)} = ${player.lastProfit.toFixed(2)}元<br>
        最终盈亏：${player.lastProfit > 0 ? '盈利' : '亏损'} ${Math.abs(player.lastProfit).toFixed(2)}元
    `;

    document.getElementById('investmentResult').innerHTML = resultMessage;

    investmentCount++;
    if (investmentCount >= (1 + players[currentPlayerIndex].extraInvestment)) {
        canInvest = false;
    }
    updateButtons();

    checkGameOver();
}

function updateStockPrices() {
    stocks.forEach(stock => {
        let volatility = isEconomicCrisis ? 1.5 : 1; // 经济危机期间波动性增加50%
        switch(stock.name) {
            case 'A股':
                stock.price *= 1 + (Math.random() * 0.1 - 0.05) * volatility;
                break;
            case 'B股':
                stock.price *= 1 + (Math.random() * 0.4 - 0.2) * volatility;
                break;
            case 'C股':
                if (Math.random() < 0.1) {
                    stock.price *= 1 + (Math.random() * 0.6 - 0.3) * volatility;
                } else {
                    stock.price *= 1 + (Math.random() * 0.3 - 0.15) * volatility;
                }
                break;
        }
        stock.price = Math.max(1, stock.price);
    });
    updateStockMarket();
    updateStockPriceHistory();
    updateStockChart();
}

function nextTurn() {
    players.forEach(player => {
        player.lastProfit = 0;
        player.lastReward = 0;
        player.extraInvestment = 0;
    });

    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    if (currentPlayerIndex === 0) {
        round++;
    }
    updateStockMarket();
    updatePlayerMoney();
    updateCurrentPlayer();
    updateRoundInfo();

    if (round === totalRounds) {
        endGame();
    } else {
        document.getElementById('dice').textContent = '🎲';
        document.getElementById('diceResult').innerHTML = '';
        document.getElementById('investmentResult').innerHTML = '';
        canInvest = false;
        canRollDice = true;
        investmentCount = 0;
        updateButtons();
        saveGameState();
    }

    // 检查是否触发黑天鹅事件
    if (Math.random() < BLACK_SWAN_PROBABILITY) {
        triggerBlackSwanEvent();
    }

    // 检查是否触发经济危机
    if (!isEconomicCrisis && Math.random() < ECONOMIC_CRISIS_PROBABILITY) {
        triggerEconomicCrisis();
    } else if (isEconomicCrisis && Math.random() < 0.2) { // 20% 概率结束经济危机
        endEconomicCrisis();
    }
}

function updateRoundInfo() {
    const roundInfoDiv = document.getElementById('roundInfo');
    roundInfoDiv.innerHTML = `<p>当前回：${round + 1} / ${totalRounds}</p>`;
}

function endGame() {
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('gameResult').style.display = 'block';

    // 计算每个玩家的最终现金
    players.forEach(player => {
        player.stockDetails = [];
        Object.entries(player.stocks).forEach(([stockName, amount]) => {
            const stock = stocks.find(s => s.name === stockName);
            player.stockDetails.push({
                name: stockName,
                amount: amount,
                price: stock.price,
                value: amount * stock.price
            });
        });
    });

    // 按现金数量排序
    players.sort((a, b) => b.money - a.money);

    // 显示获胜者
    const winnerDiv = document.getElementById('winner');
    winnerDiv.innerHTML = `<h3>获胜者：${players[0].name}，最终现金：${players[0].money.toFixed(2)}元</h3>`;

    // 定义奖牌emoji
    const medals = ['🥇', '🥈', '🥉', '🏅'];  // 使用 '🏅' 作为铁奖章

    // 显示最终结果
    const finalResultsTable = document.getElementById('finalResults');
    finalResultsTable.innerHTML = `
        <tr>
            <th>排名</th>
            <th>玩家</th>
            <th>最终现金</th>
            <th>详细信息</th>
        </tr>
        ${players.map((player, index) => `
            <tr>
                <td>${index + 1} ${index < 3 ? medals[index] : ''}</td>
                <td>${player.name}</td>
                <td>${player.money.toFixed(2)}元</td>
                <td>
                    <button onclick="showPlayerDetails(${index})">查看详情</button>
                </td>
            </tr>
        `).join('')}
    `;

    // 保存游戏状态
    saveGameState();
}

function showPlayerDetails(playerIndex) {
    const player = players[playerIndex];
    let detailsHTML = `
        <div class="player-details">
            <h2>${player.name} 的资产详情</h2>
            <div class="asset-summary">
                <p>现金: ${player.money.toFixed(2)}元</p>
                <p>总资产: ${(player.money + player.stockDetails.reduce((sum, stock) => sum + stock.value, 0)).toFixed(2)}元</p>
            </div>
            <table>
                <tr>
                    <th>股票</th>
                    <th>数量</th>
                    <th>单价</th>
                    <th>总价值</th>
                </tr>
    `;
    
    player.stockDetails.forEach(stock => {
        detailsHTML += `
            <tr>
                <td>${stock.name}</td>
                <td>${stock.amount}股</td>
                <td>${stock.price.toFixed(2)}元</td>
                <td>${stock.value.toFixed(2)}元</td>
            </tr>
        `;
    });
    
    detailsHTML += `
            </table>
        </div>
    `;
    
    const modal = document.getElementById('playerDetailsModal');
    const modalContent = document.getElementById('playerDetailsContent');
    modalContent.innerHTML = detailsHTML;
    modal.style.display = "block";

    const span = document.getElementsByClassName("close")[1]; // 使用第二个关闭按钮
    span.onclick = function() {
        modal.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }
}

function saveGameState() {
    const gameState = {
        players: players,
        currentPlayerIndex: currentPlayerIndex,
        stocks: stocks,
        round: round,
        totalRounds: totalRounds,
        canInvest: canInvest,
        canRollDice: canRollDice,
        investmentCount: investmentCount
    };
    localStorage.setItem('stockGameState', JSON.stringify(gameState));
}

function loadGameState() {
    const savedState = localStorage.getItem('stockGameState');
    if (savedState) {
        const gameState = JSON.parse(savedState);
        players = gameState.players;
        currentPlayerIndex = gameState.currentPlayerIndex;
        stocks = gameState.stocks;
        round = gameState.round;
        totalRounds = gameState.totalRounds;
        canInvest = gameState.canInvest;
        canRollDice = gameState.canRollDice;
        investmentCount = gameState.investmentCount;
        updateButtons();
        return true;
    }
    return false;
}

function checkGameOver() {
    const bankruptPlayer = players.find(player => player.money < MINIMUM_BALANCE);
    if (bankruptPlayer) {
        alert(`${bankruptPlayer.name}的资金低于${MINIMUM_BALANCE}元，游戏结束！`);
        endGame();
    }
}

function updateButtons() {
    document.querySelector('button[onclick="rollDice()"]').disabled = !canRollDice;
    document.querySelector('button[onclick="invest()"]').disabled = !canInvest;
    document.getElementById('nextTurnButton').disabled = canRollDice || (canInvest && investmentCount === 0);
}

function clearGameState() {
    localStorage.removeItem('stockGameState');
}

function openSettingsModal() {
    document.getElementById('settingsModal').style.display = 'block';
    document.getElementById('totalRoundsInput').value = totalRounds;
    document.getElementById('initialFundsInput').value = initialFunds;
    document.getElementById('blackSwanProbabilityInput').value = BLACK_SWAN_PROBABILITY * 100;
    document.getElementById('economicCrisisProbabilityInput').value = ECONOMIC_CRISIS_PROBABILITY * 100;
    document.getElementById('predictionAccuracyInput').value = PREDICTION_ACCURACY * 100;
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function saveSettings() {
    totalRounds = parseInt(document.getElementById('totalRoundsInput').value);
    initialFunds = parseInt(document.getElementById('initialFundsInput').value);
    BLACK_SWAN_PROBABILITY = parseFloat(document.getElementById('blackSwanProbabilityInput').value) / 100;
    ECONOMIC_CRISIS_PROBABILITY = parseFloat(document.getElementById('economicCrisisProbabilityInput').value) / 100;
    PREDICTION_ACCURACY = parseFloat(document.getElementById('predictionAccuracyInput').value) / 100;
    updateInitialFundsDisplay();
    closeSettingsModal();
}

function updateInitialFundsDisplay() {
    document.getElementById('initialFundsDisplay').textContent = `每位玩家初始资金：${initialFunds}元`;
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('settingsButton').addEventListener('click', openSettingsModal);
    document.getElementsByClassName('close')[0].addEventListener('click', closeSettingsModal);
    window.addEventListener('click', function(event) {
        if (event.target == document.getElementById('settingsModal')) {
            closeSettingsModal();
        }
    });
    updateInitialFundsDisplay();
});

function testDiceRandomness(rolls = 1000) {
    const results = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0};
    for (let i = 0; i < rolls; i++) {
        const roll = Math.floor(Math.random() * 6) + 1;
        results[roll]++;
    }
    console.log("Dice roll test results:");
    for (let i = 1; i <= 6; i++) {
        console.log(`${i}: ${results[i]} (${(results[i] / rolls * 100).toFixed(2)}%)`);
    }
}

// 添加新的函数来处理黑天鹅事件
function triggerBlackSwanEvent() {
    const events = [
        { name: "技术突破", effect: "所有股票价格上涨20%" },
        { name: "自然灾害", effect: "所有股票价格下跌15%" },
        { name: "政策变动", effect: "随机一支股票价格波动-30%到+30%" },
        { name: "国际冲突", effect: "B股和C股价格下跌25%" },
        { name: "重大发现", effect: "A股价格上涨40%" }
    ];
    const event = events[Math.floor(Math.random() * events.length)];
    
    let message = `<h3>黑天鹅事件：${event.name}！</h3><p>${event.effect}</p><ul>`;
    
    switch(event.name) {
        case "技术突破":
            stocks.forEach(stock => {
                const oldPrice = stock.price;
                stock.price *= 1.2;
                message += `<li>${stock.name}: ${oldPrice.toFixed(2)}元 → ${stock.price.toFixed(2)}元</li>`;
            });
            break;
        case "自然灾害":
            stocks.forEach(stock => {
                const oldPrice = stock.price;
                stock.price *= 0.85;
                message += `<li>${stock.name}: ${oldPrice.toFixed(2)}元 → ${stock.price.toFixed(2)}元</li>`;
            });
            break;
        case "政策变动":
            const randomStock = stocks[Math.floor(Math.random() * stocks.length)];
            const randomOldPrice = randomStock.price;
            randomStock.price *= 1 + (Math.random() * 0.6 - 0.3);
            message += `<li>${randomStock.name}: ${randomOldPrice.toFixed(2)}元 → ${randomStock.price.toFixed(2)}元</li>`;
            break;
        case "国际冲突":
            stocks.filter(stock => stock.name !== "A股").forEach(stock => {
                const oldPrice = stock.price;
                stock.price *= 0.75;
                message += `<li>${stock.name}: ${oldPrice.toFixed(2)}元 → ${stock.price.toFixed(2)}元</li>`;
            });
            break;
        case "重大发现":
            const aStock = stocks.find(stock => stock.name === "A股");
            const aOldPrice = aStock.price;
            aStock.price *= 1.4;
            message += `<li>${aStock.name}: ${aOldPrice.toFixed(2)}元 → ${aStock.price.toFixed(2)}元</li>`;
            break;
    }
    
    message += "</ul>";
    updateStockMarket();
    showEventMessage(message);
    addChartAnnotation('黑天鹅事件：' + event.name);
    updateStockChart();
}

// 添加新的函数来处理经济危机
function triggerEconomicCrisis() {
    isEconomicCrisis = true;
    let message = "<h3>经济危机爆发！</h3><p>所有股票价格下跌30%。在危机期间，股票波动将更加剧烈。</p><ul>";
    stocks.forEach(stock => {
        const oldPrice = stock.price;
        stock.price *= 0.7;
        message += `<li>${stock.name}: ${oldPrice.toFixed(2)}元 → ${stock.price.toFixed(2)}元</li>`;
    });
    message += "</ul>";
    updateStockMarket();
    showEventMessage(message);
    addChartAnnotation('经济危机爆发');
    updateStockChart();
}

function endEconomicCrisis() {
    isEconomicCrisis = false;
    let message = "<h3>经济危机结束！</h3><p>市场开始复苏，所有股票价格上涨20%。</p><ul>";
    stocks.forEach(stock => {
        const oldPrice = stock.price;
        stock.price *= 1.2;
        message += `<li>${stock.name}: ${oldPrice.toFixed(2)}元 → ${stock.price.toFixed(2)}元</li>`;
    });
    message += "</ul>";
    updateStockMarket();
    showEventMessage(message);
    addChartAnnotation('经济危机结束');
    updateStockChart();
}

// 添加新的函数来显示事件消息
function showEventMessage(message) {
    const eventModal = document.createElement('div');
    eventModal.className = 'modal event-modal';
    eventModal.innerHTML = `
        <div class="modal-content event-modal-content">
            <span class="close">&times;</span>
            ${message}
        </div>
    `;
    document.body.appendChild(eventModal);
    eventModal.style.display = 'block';

    const closeBtn = eventModal.querySelector('.close');
    closeBtn.onclick = function() {
        eventModal.style.display = 'none';
        eventModal.remove();
    }
}

function initializeStockPriceHistory() {
    stocks.forEach(stock => {
        stockPriceHistory[stock.name] = [stock.price];
    });
}

function createStockChart() {
    let ctx = document.getElementById('stockChart').getContext('2d');
    stockChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [0],
            datasets: stocks.map(stock => ({
                label: stock.name,
                data: [stock.price],
                borderColor: getStockColor(stock.name),
                fill: false,
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 5
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 2,
            title: {
                display: true,
                text: '股票价格走势'
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '回合'
                    },
                    ticks: {
                        font: {
                            size: 10
                        }
                    }
                },
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '价格'
                    },
                    ticks: {
                        stepSize: 50,
                        font: {
                            size: 10
                        }
                    }
                }
            },
            plugins: {
                legend: {
                    labels: {
                        font: {
                            size: 12
                        },
                        usePointStyle: true,
                        pointStyle: 'rect',
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            return datasets.map(function(dataset, i) {
                                return {
                                    text: dataset.label,
                                    fillStyle: dataset.borderColor,
                                    strokeStyle: dataset.borderColor,
                                    lineWidth: 2,
                                    hidden: !chart.isDatasetVisible(i),
                                    index: i
                                };
                            });
                        }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
                annotation: {
                    annotations: []
                }
            },
            hover: {
                mode: 'nearest',
                intersect: true
            },
            animation: {
                duration: 0
            }
        }
    });
}

function getStockColor(stockName) {
    switch(stockName) {
        case 'A股': return 'rgb(255, 99, 132)';
        case 'B股': return 'rgb(54, 162, 235)';
        case 'C股': return 'rgb(128, 0, 128)';
        default: return 'rgb(201, 203, 207)';
    }
}

function updateStockPriceHistory() {
    stocks.forEach(stock => {
        stockPriceHistory[stock.name].push(stock.price);
    });
}

function updateStockChart() {
    stockChart.data.labels.push(stockChart.data.labels.length);
    stockChart.data.datasets.forEach((dataset, index) => {
        dataset.data.push(stocks[index].price);
    });
    stockChart.update();

    // 添加数据点标签
    stockChart.options.plugins.datalabels = {
        align: 'top',
        anchor: 'end',
        font: {
            weight: 'bold'
        },
        formatter: (value) => value.toFixed(2)
    };
    stockChart.update();
}

// 添加新函数来处理图表标记
function addChartAnnotation(label) {
    const annotation = {
        type: 'line',
        mode: 'vertical',
        scaleID: 'x',
        value: stockChart.data.labels.length,
        borderColor: 'red',
        borderWidth: 2,
        label: {
            content: label,
            enabled: true,
            position: 'top'
        }
    };
    stockChart.options.plugins.annotation.annotations.push(annotation);
}