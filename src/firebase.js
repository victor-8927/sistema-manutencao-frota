// Importar as funções necessárias do SDK do Firebase
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// Importar o cliente do Supabase
import { createClient } from '@supabase/supabase-js';

// Configuração do Firebase da sua aplicação
const firebaseConfig = {
  apiKey: "AIzaSyCfxM0tbi8S-NbjPTZHFKlaYKGQbz5Ds",
  authDomain: "sistema-de-manutencao-g.firebaseapp.com",
  projectId: "sistema-de-manutencao-g",
  storageBucket: "sistema-de-manutencao-g.firebasestorage.app",
  messagingSenderId: "495876097440",
  appId: "1:495876097440:web:43959c3557519b4a8f90c5",
  measurementId: "G-Q83223V1M7"
};

// Configuração do Supabase (utiliza as tuas chaves de conexão do projeto Supabase)
const SUPABASE_URL = 'https://o-teu-projeto.supabase.co'; // Substitui pelo teu URL do Supabase
const SUPABASE_ANON_KEY = 'a-tua-chave-anon-key'; // Substitui pela tua chave anon do Supabase

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Inicializar e exportar o Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export { app, analytics };