# Princípios e Diretrizes de Engenharia

Este documento estabelece as diretrizes arquiteturais e operacionais para a construção e manutenção de servidores integrados a este MCP.

## 1. Persistência e Integridade de Dados
* **Fonte Única de Verdade:** Dados primários e lógicas de estado fundamentais devem ser gerenciados e persistidos no banco de dados SQLite. Isso garante atomicidade, durabilidade e conscistência para as operações em oposição as práticas voláteis no gerenciamento em memória ou arquivos descentralizados.
* **Contrato Estrito de Comunicação (Validação):** Entradas e saídas de ferramentas devem ser integralmente cobertas por definições de esquema correspondentes com **Zod**. Os retornos de validação e de erros devem prover o máximo de clareza contextual.

## 2. Padrões de Comunicação e Depuração
* **Governança do Stdout:** O canal `stdout` é reservado e exclusivo para o envio e transações do protocolo JSON-RPC requerido pelo MCP. Nenhuma operação fora destas especificações deve imprimir mensagens ou logs corriqueiros neste canal.
* **Observabilidade via Stderr:** Para o suporte sistêmico, acompanhamento de execução de tarefas, captura de progresso ou erros de implementação, as saídas devem ser direcionadas ao uso do canal secundário `stderr` (ex: `console.error`).

## 3. Consolidação de Contexto
* **Eficiência e Evitação de Redundância:** O sistema visa prover um mecanismo local sustentável. Informações ativamente resolvidas ou indexadas durante a operação do MCP não devem necessitar requisições persistentes adicionais que sobrecarreguem o ciclo.
* **Consciência Situacional Contínua:** Antes de sugerir implementações massivas ou reformulações sistêmicas, os fluxos devem consultar agressivamente as abstrações contendo informações de estado para direcionamento técnico, suportando ações deliberadas e conscientes.

## 4. Requisitos Constantes de Performance
* **Eficiência Computacional:** A base de código requer um comportamento responsivo, orientando-se a abordagens não bloqueantes no Node.js, e prioridade total na otimização nas consultas e operações intensivas de I/O em banco de dados, resultando em um perfil reduzido de tempo de resposta global em interações contínuas nas IDEs clientes.

