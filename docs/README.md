# MCP Template: Local Brain DNA

Este é o template base para a criação de Agentes de Contexto Local. Ele foi projetado para rodar nativamente em arquitetura Apple Silicon (M4), priorizando latência zero e privacidade absoluta.

## Arquitetura Base
* **Protocolo:** Model Context Protocol (MCP) via **STDIO**.
* **Runtime:** Node.js com suporte nativo a ESM (ECMAScript Modules).
* **Persistência:** SQLite via `better-sqlite3` com modo **WAL (Write-Ahead Logging)** ativado para máxima performance em SSDs NVMe.
* **Validação:** Schemas de entrada rigorosos utilizando **Zod**.
* **Privacidade:** 100% Local-First. Nenhuma informação de contexto sai do host através deste servidor.

## Capacidades Iniciais
* **Handshake Robusto:** Implementação padrão de inicialização do protocolo.
* **Gerenciamento de Erros:** Captura de sinais do sistema (`SIGINT`, `SIGTERM`) para fechamento limpo do banco de dados.
* **Isolamento de Canais:** Comunicação de dados via `stdout` e telemetria/logs via `stderr`.

## Como usar este Template
1. Clone esta pasta para um novo diretório (ex: `mcp-projects`).
2. Altere o `name` no `package.json`.
3. Defina suas novas ferramentas (`tools`) no `src/index.ts`.
4. Configure o novo esquema de tabelas no `src/db.ts`.
