# Filosofia de Engenharia de Contexto

Este documento rege o comportamento dos agentes que utilizam ou modificam este MCP.

## 1. Integridade de Dados
* **O SQLite é a Verdade:** Documentos de texto são voláteis; dados estruturados no banco de dados são permanentes. Toda decisão importante deve ser atomizada em tabelas.
* **Validação em Primeiro Lugar:** Nenhuma ferramenta deve aceitar inputs sem um schema **Zod** correspondente. Erros de validação devem ser informativos para o usuário.

## 2. Comunicação e Debugging
* **O Silêncio do Stdout:** O canal `stdout` é exclusivo para o protocolo JSON-RPC do MCP. **Nunca** use `console.log` para mensagens de texto comuns.
* **Logs no Stderr:** Todas as mensagens de status, progresso ou erros técnicos devem ser enviadas exclusivamente via `console.error` (canal `stderr`).

## 3. Contexto sem Redundância
* **Aprendizado Único:** O objetivo deste sistema é eliminar a redundância. Se uma informação foi salva através deste MCP, ela não deve ser perguntada novamente em sessões futuras.
* **Consciência Situacional:** O agente deve sempre consultar o `get_context` antes de sugerir mudanças arquiteturais pesadas.

## 4. Hardware e Performance
* **Otimização M4:** O código deve ser leve e aproveitar a eficiência de threads do Apple Silicon. Operações de I/O de banco de dados devem ser otimizadas para evitar bloqueios da interface da IDE.
