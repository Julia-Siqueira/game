const socket = io();

// Elementos da Tela de Configuração
const setupDiv = document.getElementById('setup');
const numPlayersInput = document.getElementById('numPlayers');
const startSetupBtn = document.getElementById('startSetupBtn');
const setupErrorDiv = document.getElementById('setupError');

// Elementos da Tela de Coleta de Nomes
const collectNamesDiv = document.getElementById('collectNames');
const currentPlayerSpan = document.getElementById('currentPlayer');
const playerNameInput = document.getElementById('playerNameInput');
const submitPlayerNameBtn = document.getElementById('submitPlayerNameBtn');

// Elementos da Tela do Jogo
const gameDiv = document.getElementById('game');
const questionNumberSpan = document.getElementById('questionNumber');
const totalQuestionsSpan = document.getElementById('totalQuestions');
const questionP = document.getElementById('question');
const optionsDiv = document.getElementById('options');
const submitAnswerBtn = document.getElementById('submitAnswerBtn');
const resultDiv = document.getElementById('result');

// Elementos da Tela de Resultados
const resultsDiv = document.getElementById('results');
const finalResultsDiv = document.getElementById('finalResults');
const restartBtn = document.getElementById('restartBtn');

// Elementos da Lista de Jogadores
const playersListUl = document.getElementById('players');

// Variáveis de Controle
let numPlayers = 0;
let currentPlayerIndex = 0;
let selectedOption = '';

// Eventos da Tela de Configuração
startSetupBtn.addEventListener('click', () => {
    const num = parseInt(numPlayersInput.value);
    if (isNaN(num) || num <= 0) {
        setupErrorDiv.textContent = 'Por favor, insira um número válido de jogadores.';
        return;
    }
    setupErrorDiv.textContent = '';
    socket.emit('startGameSetup', { numPlayers: num });
});

// Eventos da Tela de Coleta de Nomes
socket.on('collectNames', (data) => {
    setupDiv.style.display = 'none';
    collectNamesDiv.style.display = 'block';
    numPlayers = data.numPlayers;
    currentPlayerIndex = 1;
    currentPlayerSpan.textContent = currentPlayerIndex;
});

submitPlayerNameBtn.addEventListener('click', () => {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Por favor, insira um nome válido.');
        return;
    }
    socket.emit('collectPlayerNames', { playerName: name, numPlayers });
    playerNameInput.value = '';
    currentPlayerIndex++;
    if (currentPlayerIndex > numPlayers) {
        collectNamesDiv.style.display = 'none';
    } else {
        currentPlayerSpan.textContent = currentPlayerIndex;
    }
});

// Atualização da Lista de Jogadores
socket.on('updatePlayers', (players) => {
    playersListUl.innerHTML = '';
    players.forEach(player => {
        const li = document.createElement('li');
        li.textContent = player.name;
        playersListUl.appendChild(li);
    });
});

// Início do Jogo
socket.on('gameStarted', (data) => {
    collectNamesDiv.style.display = 'none';
    gameDiv.style.display = 'block';
    totalQuestionsSpan.textContent = data.questions.length;
});

// Exibição de uma Nova Pergunta
socket.on('newQuestion', (data) => {
    resultDiv.innerHTML = '';
    selectedOption = '';
    questionNumberSpan.textContent = data.questionNumber;
    totalQuestionsSpan.textContent = data.totalQuestions;
    questionP.textContent = data.question;
    optionsDiv.innerHTML = '';

    data.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('optionBtn');
        button.addEventListener('click', () => {
            document.querySelectorAll('.optionBtn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedOption = option;
            submitAnswerBtn.style.display = 'block';
        });
        optionsDiv.appendChild(button);
    });

    submitAnswerBtn.style.display = 'none';
});

// Enviar Resposta
submitAnswerBtn.addEventListener('click', () => {
    if (!selectedOption) {
        alert('Por favor, selecione uma opção.');
        return;
    }
    socket.emit('sendAnswer', { answer: selectedOption });
    socket.emit('markAnswered');
    submitAnswerBtn.style.display = 'none';
});

// Receber Resultado da Resposta
socket.on('answerResult', (data) => {
    if (data.isCorrect) {
        resultDiv.innerHTML = `<p style="color: green;">CORRETO! Resposta: ${data.correctAnswer}</p>`;
    } else {
        resultDiv.innerHTML = `<p style="color: red;">INCORRETO! Resposta Correta: ${data.correctAnswer}</p>`;
    }
});

// Finalizar o Jogo e Mostrar Resultados
socket.on('gameEnded', (data) => {
    gameDiv.style.display = 'none';
    resultsDiv.style.display = 'block';
    finalResultsDiv.innerHTML = '';

    data.players.forEach(player => {
        const p = document.createElement('p');
        p.textContent = `${player.name}: Acertos - ${player.correct}, Erros - ${player.incorrect}`;
        finalResultsDiv.appendChild(p);
    });
});

// Reiniciar o Jogo
restartBtn.addEventListener('click', () => {
    location.reload();
});

// Mensagem de Erro
socket.on('errorMessage', (msg) => {
    setupErrorDiv.textContent = msg;
});
