// dando todos os imports necessários
import express from 'express';
import fs from 'fs';
import axios from 'axios';
import nodemailer from 'nodemailer';
import cron from 'node-cron';
import dotenv from 'dotenv';


dotenv.config(); // pegando as informações sensiveis da .env

const app = express(); // no app que vou usar as funções do express
app.use(express.json());


const USERS_FILE = './users.json'; // arquivo onde está armazenado os usuários em json, "simulando um banco"

function loadUsers() { // carrega os usuários json 
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}


async function getWeather(city) { // fazer a sincronia com o openweather
  const apiKey = process.env.OPENWEATHER_KEY; // aqui você coloca a SUA key da api para rodar
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=pt_br`;
  const res = await axios.get(url); //  faz uma requisição HTTP GET e espera a resposta da API antes de continuar
  return res.data;
}


async function sendEmail(to, subject, text) { // para enviar o email por gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER, // utiliza o seu e-mail (coloque no .env)
      pass: process.env.EMAIL_PASS, // utiliza a sua senha (coloque no .env)
    }
  });

  // estrutura base para um email 
  await transporter.sendMail({
    from: process.env.EMAIL_USER, // novamente utilizando o seu email da env
    to,
    subject,
    text,
  });
}

async function sendDailyWeather() {
  const users = loadUsers(); // carrega os user pois vai precisar

  for (const user of users) { // para cada usuário...
    try {
      const weather = await getWeather(user.city); // pega a cidade do usuario

      // a message puxa os dados do user e do weather para mandar no email
      const message = `Olá, ${user.name}! A previsão de hoje em ${user.city} é: ${weather.weather[0].description}, temperatura de ${weather.main.temp}°C.`;
      await sendEmail(user.email, `Previsão do tempo para ${user.city}`, message);

      // dando um retorno se deu certo ou não
      console.log(`Email enviado para ${user.email}`);
    } catch (err) {
      console.error(`Erro ao enviar email para ${user.email}:`, err.message);
    }
  }
}

// agenda todos os dias às 8h da manhã, caso queira fazer testes, coloque * * * * *, assim vai disparar o email a cada minuto
// ou caso queria outro horário de envio é só mudar
cron.schedule('0 8 * * *', sendDailyWeather);


// endpoint para cadastrar novo usuário
app.post('/users', (req, res) => {
  const { name, email, city, state } = req.body;
  if (!name || !email || !city || !state) return res.status(400).send('Campos obrigatórios faltando.'); // verificando se ficou sem algum campo

  const users = loadUsers();

  // cadastra o usuário
  users.push({ name, email, city, state });
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  res.send('Usuário cadastrado com sucesso!');
});

// 
app.listen(3000, () => {
  console.log('Servidor rodando em http://localhost:3000');
});