# Guia de Setup (Clonagem)

Siga este guia sempre que precisar criar um novo servidor MCP a partir deste template. Este procedimento pode ser executado manualmente ou seguido por uma IA.

## Pré-requisitos
- Node.js (versão recente com suporte a ESM)
- NPM

## Passo a Passo

### 1. Copiar o Template
Duplique a pasta do template para o nome do seu novo projeto (ex: `mcp-persona`).

```bash
cp -r mcp-template mcp-novo-projeto
cd mcp-novo-projeto
```

### 2. Limpar Dados Antigos
Remova artefatos de build, node_modules e bancos de dados locais do template original.

```bash
rm -rf node_modules dist local_data.db package-lock.json
```

### 3. Configurar Identidade do Projeto
Edite o arquivo `package.json`:
- Altere `name` para o nome do novo projeto (ex: `"name": "mcp-novo-projeto"`).
- Opcional: Atualize a `description` e `version`.

### 4. Instalar Dependências
Instale as dependências limpas.

```bash
npm install
```

### 5. Personalizar Banco de Dados
Edite o arquivo `src/db.ts` (ou crie um arquivo de migração inicial):
- Defina as tabelas necessárias para o seu novo MCP dentro da função `initDatabase` ou através de um script de setup dedicado.

Exemplo em `src/db.ts`:
```typescript
db.exec(`
  CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  )
`);
```

### 6. Implementar Ferramentas
Edite `src/index.ts`:
- Remova as ferramentas de exemplo (`template_ping`).
- Adicione suas novas ferramentas usando `zod` para validação.

### 7. Build e Validação
Compile o projeto e verifique se tudo está funcionando.

```bash
npm run build
npm start
```
(Deve rodar sem erros e criar um novo `local_data.db`).

### 8. Configurar na IDE
Adicione o novo servidor ao seu arquivo de configuração MCP (ex: `claude_desktop_config.json`), apontando para o caminho absoluto do novo projeto.

---
**Pronto!** Seu novo "Cérebro Local" está operante.
