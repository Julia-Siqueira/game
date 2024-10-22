const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

// Estrutura para armazenar jogadores
let players = [];
let gameState = 'waiting'; // Estados: waiting, collectingNames, inProgress, ended
let currentQuestionIndex = 0;
let questions = [];
const totalQuestions = () => players.length;

// Perguntas de múltipla escolha (Exemplo)
const allQuestions = [
    {
        question: "O que é JavaScript?",
        options: ["Uma linguagem de programação", "Um tipo de café", "Um sistema operacional", "Um framework de CSS"],
        correctAnswer: "Uma linguagem de programação"
    },
    {
        question: "Qual destes é um framework JavaScript?",
        options: ["React", "Laravel", "Django", "Ruby on Rails"],
        correctAnswer: "React"
    },
    // Adicione mais perguntas conforme necessário
];

io.on('connection', (socket) => {
    console.log('Novo jogador conectado:', socket.id);

    // Evento para iniciar a configuração do jogo
    socket.on('startGameSetup', (data) => {
        if (gameState === 'waiting') {
            const numPlayers = parseInt(data.numPlayers);
            if (isNaN(numPlayers) || numPlayers <= 0) {
                socket.emit('errorMessage', 'Número de jogadores inválido.');
                return;
            }
            gameState = 'collectingNames';
            socket.emit('collectNames', { numPlayers });
        }
    });

    // Evento para coletar nomes dos jogadores
    socket.on('collectPlayerNames', (data) => {
        if (gameState !== 'collectingNames') return;

        const playerName = data.playerName.trim();
        if (playerName) {
            players.push({
                id: socket.id,
                name: playerName,
                correct: 0,
                incorrect: 0
            });
            io.emit('updatePlayers', players);

            // Verifica se todos os nomes foram coletados
            if (players.length === data.numPlayers) {
                // Seleciona as perguntas com base no número de jogadores
                questions = allQuestions.slice(0, totalQuestions());
                gameState = 'inProgress';
                io.emit('gameStarted', { questions });
                sendQuestion();
            }
        }
    });

    // Evento para receber respostas dos jogadores
    socket.on('sendAnswer', (data) => {
        if (gameState !== 'inProgress') return;

        const player = players.find(p => p.id === socket.id);
        if (!player) return;

        const currentQuestion = questions[currentQuestionIndex];
        if (!currentQuestion) return;

        const isCorrect = data.answer === currentQuestion.correctAnswer;
        if (isCorrect) {
            player.correct += 1;
        } else {
            player.incorrect += 1;
        }

        // Envia o resultado da resposta para o jogador
        socket.emit('answerResult', { isCorrect, correctAnswer: currentQuestion.correctAnswer });

        // Verifica se todas as respostas foram recebidas para a pergunta atual
        const allAnswered = players.every(p => p.lastAnswered === true || p.id === socket.id);
        if (allAnswered) {
            currentQuestionIndex++;
            if (currentQuestionIndex < questions.length) {
                sendQuestion();
            } else {
                endGame();
            }
        }
    });

    // Marca que o jogador respondeu
    socket.on('markAnswered', () => {
        const player = players.find(p => p.id === socket.id);
        if (player) {
            player.lastAnswered = true;
        }
    });

    // Atualiza a lista de jogadores para todos
    socket.on('updatePlayers', () => {
        io.emit('updatePlayers', players);
    });

    // Evento de desconexão
    socket.on('disconnect', () => {
        console.log('Jogador desconectado:', socket.id);
        players = players.filter(player => player.id !== socket.id);
        io.emit('updatePlayers', players);
    });
});

// Função para enviar a pergunta atual
function sendQuestion() {
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion) {
        // Reseta a marca de resposta para todos os jogadores
        players.forEach(player => {
            player.lastAnswered = false;
        });

        io.emit('newQuestion', {
            question: currentQuestion.question,
            options: currentQuestion.options,
            questionNumber: currentQuestionIndex + 1,
            totalQuestions: questions.length
        });
    }
}

// Função para encerrar o jogo e enviar resultados
function endGame() {
    gameState = 'ended';
    io.emit('gameEnded', { players });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
