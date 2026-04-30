# 💈 BossBarber

Sistema de agendamento online para barbearias, com painel do barbeiro, página pública de reservas e confirmação automática via WhatsApp.

Construído com **React + Vite + TypeScript + Tailwind CSS + shadcn/ui** e **Lovable Cloud (Supabase)** como backend.

---

## 📋 Sumário

1. [Pré-requisitos](#1-pré-requisitos)
2. [Extensões recomendadas no VS Code](#2-extensões-recomendadas-no-vs-code)
3. [Passo a passo da instalação](#3-passo-a-passo-da-instalação)
4. [Configuração do Supabase / Lovable Cloud](#4-configuração-do-supabase--lovable-cloud)
5. [Estrutura do projeto](#5-estrutura-do-projeto)
6. [Scripts disponíveis](#6-scripts-disponíveis)
7. [Solução de problemas](#7-solução-de-problemas)

---

## 1. Pré-requisitos

Antes de começar, instale na sua máquina:

| Ferramenta | Versão recomendada | Link de download |
|------------|--------------------|------------------|
| **Node.js** | 18 LTS ou superior | <https://nodejs.org/pt-br/download> |
| **npm** | Já vem junto com o Node.js | — |
| **Visual Studio Code** | Última versão | <https://code.visualstudio.com/Download> |
| **Git** *(opcional, mas recomendado)* | Última versão | <https://git-scm.com/downloads> |

> ✅ Para verificar se o Node já está instalado, abra o terminal e rode:
> ```bash
> node -v
> npm -v
> ```

---

## 2. Extensões recomendadas no VS Code

Abra o VS Code, vá até a aba **Extensões** (`Ctrl + Shift + X`) e instale:

| Extensão | Para que serve |
|----------|----------------|
| **ESLint** (`dbaeumer.vscode-eslint`) | Aponta erros de código em tempo real |
| **Prettier - Code formatter** (`esbenp.prettier-vscode`) | Formata o código automaticamente ao salvar |
| **Tailwind CSS IntelliSense** (`bradlc.vscode-tailwindcss`) | Autocomplete e preview das classes do Tailwind |
| **ES7+ React/Redux/React-Native snippets** (`dsznajder.es7-react-js-snippets`) | Atalhos para criar componentes React rapidamente |
| **TypeScript Vue Plugin (Volar)** ou **TypeScript and JavaScript Language Features** | Suporte aprimorado a TypeScript |
| **GitLens** *(opcional)* | Visualiza o histórico do Git de cada linha |
| **Path Intellisense** *(opcional)* | Autocomplete para caminhos de arquivos |

> 💡 **Dica:** Ative o "Format on Save" do VS Code em `Settings → Editor: Format On Save`.

---

## 3. Passo a passo da instalação

### 3.1. Baixar o código

Você pode obter o código de duas maneiras:

**Opção A — Git Clone (recomendado)**
```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd bossbarber
```

**Opção B — Download em ZIP**
1. No GitHub do projeto, clique em **Code → Download ZIP**.
2. Extraia o arquivo em uma pasta de sua escolha.
3. Abra a pasta no VS Code (`File → Open Folder...`).

### 3.2. Instalar as dependências

Dentro da pasta do projeto, abra o terminal integrado do VS Code (`Ctrl + '`) e rode:

```bash
npm install
```

Isso vai baixar todas as bibliotecas necessárias (React, Vite, Tailwind, shadcn/ui, Supabase, etc.). Pode levar alguns minutos.

### 3.3. Rodar o projeto em modo de desenvolvimento

```bash
npm run dev
```

O Vite vai subir o servidor local. Você verá algo como:

```
  VITE v5.x.x  ready in 432 ms
  ➜  Local:   http://localhost:8080/
```

Abra <http://localhost:8080> no navegador para ver o BossBarber rodando! 🚀

---

## 4. Configuração do Supabase / Lovable Cloud

Este projeto usa o **Lovable Cloud** como backend, que internamente é alimentado por uma instância gerenciada do **Supabase**. As variáveis de ambiente já vêm preenchidas automaticamente quando você baixa o projeto pelo Lovable, mas se você precisar criá-las manualmente em outra máquina, faça o seguinte:

### 4.1. Crie um arquivo `.env` na raiz do projeto

Na raiz do projeto (mesmo nível do `package.json`), crie um arquivo chamado `.env` com este conteúdo:

```env
VITE_SUPABASE_URL=https://pwpyhlzsjznwntpefygk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3cHlobHpzanpud250cGVmeWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczNjE5MDcsImV4cCI6MjA5MjkzNzkwN30.x64r4F2xIv2Dhd6PtZRJp3vHLgxE6vMClKxhQjtS4B0
VITE_SUPABASE_PROJECT_ID=pwpyhlzsjznwntpefygk
```

> 🔒 **Importante:** A `VITE_SUPABASE_PUBLISHABLE_KEY` (também chamada de "anon key") é uma chave **pública** — pode ser exposta no front-end com segurança, pois o acesso aos dados é controlado pelas políticas de **Row Level Security (RLS)** definidas no Supabase.
> 
> ⚠️ **Nunca** coloque a `service_role_key` no `.env` do frontend. Ela só deve ser usada em **edge functions** (servidor).

### 4.2. Reinicie o servidor

Após criar o `.env`, pare o `npm run dev` (`Ctrl + C`) e rode novamente:

```bash
npm run dev
```

O projeto agora se conecta ao mesmo banco que você usa no Lovable — incluindo barbeiros, serviços e agendamentos cadastrados.

### 4.3. (Opcional) Acessar o painel do Supabase

Como esse projeto roda no **Lovable Cloud**, todo o gerenciamento (tabelas, políticas RLS, edge functions) é feito **diretamente pela interface do Lovable**, no menu **Connectors → Lovable Cloud**.

---

## 5. Estrutura do projeto

```
bossbarber/
├── public/                  # Arquivos estáticos (favicon, robots.txt)
├── src/
│   ├── assets/              # Imagens e logos importados nos componentes
│   ├── components/
│   │   ├── ui/              # Componentes shadcn/ui (botões, inputs, dialogs...)
│   │   └── NavLink.tsx      # Componentes próprios do projeto
│   ├── hooks/               # Hooks customizados (use-toast, use-mobile)
│   ├── integrations/
│   │   └── supabase/
│   │       ├── client.ts    # Cliente Supabase pronto para uso (NÃO EDITAR)
│   │       └── types.ts     # Tipos TypeScript do banco (auto-gerado)
│   ├── lib/
│   │   ├── auth.tsx         # Provider de autenticação
│   │   └── utils.ts         # Funções utilitárias (cn, etc)
│   ├── pages/
│   │   ├── Landing.tsx      # Página inicial (/)
│   │   ├── Auth.tsx         # Login e cadastro do barbeiro (/auth)
│   │   ├── Dashboard.tsx    # Painel do barbeiro (/dashboard)
│   │   ├── Booking.tsx      # Página pública de agendamento (/agendar/:slug)
│   │   └── NotFound.tsx     # Página 404
│   ├── App.tsx              # Configuração das rotas
│   ├── main.tsx             # Entry point do React
│   ├── index.css            # Tokens do design system (cores, fontes, sombras)
│   └── vite-env.d.ts
├── supabase/
│   ├── config.toml          # Configurações do projeto Supabase
│   ├── functions/           # Edge functions (lógica de servidor)
│   └── migrations/          # Histórico de alterações do banco (SQL)
├── tailwind.config.ts       # Configuração do Tailwind (cores, breakpoints)
├── vite.config.ts           # Configuração do Vite
├── package.json             # Dependências e scripts
└── README.md                # Este arquivo
```

### Onde editar cada coisa

| Quero alterar... | Vá em... |
|------------------|----------|
| Layout de uma página | `src/pages/<NomeDaPágina>.tsx` |
| Um botão, input ou dialog | `src/components/ui/` |
| Cores e fontes do tema | `src/index.css` e `tailwind.config.ts` |
| Estrutura do banco de dados | Painel do Lovable → Cloud → migrations |
| Lógica de autenticação | `src/lib/auth.tsx` |
| Rotas da aplicação | `src/App.tsx` |

---

## 6. Scripts disponíveis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Sobe o servidor de desenvolvimento em <http://localhost:8080> |
| `npm run build` | Gera a versão de produção (pasta `dist/`) |
| `npm run preview` | Pré-visualiza a build de produção localmente |
| `npm run lint` | Roda o ESLint em todo o projeto |

---

## 7. Solução de problemas

**❌ "Cannot find module" ou erros estranhos depois de baixar o projeto**
```bash
rm -rf node_modules package-lock.json
npm install
```

**❌ "Failed to fetch" ou erros de conexão com o banco**
- Confira se o arquivo `.env` está na **raiz** do projeto.
- Confira se as variáveis começam com `VITE_` (caso contrário o Vite não as expõe).
- Reinicie o `npm run dev` após qualquer mudança no `.env`.

**❌ "Port 8080 is already in use"**
- Outro processo está usando a porta. Feche-o ou edite a `port` em `vite.config.ts`.

**❌ Tailwind não aplica as classes**
- Verifique se a extensão **Tailwind CSS IntelliSense** está instalada.
- Reinicie o VS Code.

---

## 📞 Suporte

- Documentação do Lovable: <https://docs.lovable.dev>
- Documentação do Supabase: <https://supabase.com/docs>
- Documentação do shadcn/ui: <https://ui.shadcn.com>

---

Feito com 💛 no **Lovable**.
