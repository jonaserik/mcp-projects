# MCP Projects: Context Agent

Este é o repositório base do projeto para a criação do servidor compatível com o Model Context Protocol (MCP). O projeto foi desenvolvido de forma modular, priorizando baixa latência de execução e total privacidade dos dados através de uma arquitetura estritamente orientada para o processamento local (Local-First).

## Arquitetura Base
* **Protocolo:** Model Context Protocol (MCP) via comunicação padronizada de **STDIO**.
* **Runtime:** Node.js com suporte nativo a ESM (ECMAScript Modules).
* **Persistência:** Banco de dados SQLite integrado utilizando `better-sqlite3`, configurado com `WAL` (Write-Ahead Logging) para garantir alta concorrência e integridade das operações.
* **Validação:** Schemas de entrada e validação de dados garantidos pela biblioteca **Zod**, estabelecendo contratos rigorosos de comunicação.
* **Privacidade:** 100% Local-First. Todo processo e armazenamento de contexto ocorrem exclusivamente no ambiente hospedeiro, não dependendo de rede externa.

## Capacidades Iniciais
* **Handshake Robusto:** Implementação padrão do protocolo de inicialização exigido pelo MCP.
* **Gerenciamento de Ciclo de Vida:** Captura e tratamento adequado de sinais de sistema (`SIGINT`, `SIGTERM`) para assegurar o encerramento seguro e o fechamento limpo das conexões, evitando corrupção de dados.
* **Isolamento de Comunicação:** Tratamento explícito de canais: transferência de payload de dados via `stdout` e registro de telemetria/erros operacionais de forma isolada via `stderr`.

