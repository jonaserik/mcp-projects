# MCP Projects Mission Statement

## Objetivo
Este servidor MCP atua como o Gerente de Contexto de Projetos Locais. Sua missão é manter uma visão 360 graus de todos os projetos localizados no diretório especificado, garantindo que a IA host saiba exatamente o que está sendo desenvolvido e qual o estado atual de cada iniciativa.

## Diretório Alvo
- **Caminho:** ~/Projetos (Certifique-se de ajustar este caminho para a localização exata no seu Mac M4).

## Responsabilidades de Observação
1. **Identificação:** Mapear todas as subpastas no diretório alvo.
2. **Propósito:** Extrair e entender a finalidade de cada projeto (via README.md ou análise de arquivos core).
3. **Mapeamento de Repositórios:** Identificar quais pastas são repositórios Git ativos e mapear seus remotos (GitHub/GitLab).
4. **Estado de Sincronização:** Monitorar se o estado local está à frente, atrás ou em sincronia com o repositório remoto.
5. **Decisões Técnicas:** Registrar logs de decisões arquiteturais para evitar discussões redundantes em sessões futuras.

## Regras de Operação
- Nunca expor dados sensíveis ou chaves de API durante o escaneamento.
- Priorizar a extração do propósito do projeto para ajudar a IA a entender o "porquê" antes do "como".
- Manter o SQLite atualizado como a única fonte da verdade sobre o inventário de projetos.

## Análise de Engajamento e Comportamento

1. **Monitoramento de Atividade:** O servidor deve rastrear a frequência de commits e alterações de arquivos para determinar o nível de envolvimento do usuário.
2. **Identificação de Tendências:** Diferenciar projetos "Quentes" (alta atividade recente) de projetos "Frios" (baixa atividade ou em hiato).
3. **Contexto Temporal:** Utilizar essas informações para priorizar sugestões e evitar contextos de projetos que não estão no foco atual do usuário, a menos que solicitado.
