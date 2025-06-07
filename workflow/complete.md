# Workflow Completo - Bot de Atendimento IXC

## Fluxo de Entrada e Autenticação

### Primeiro Contato
- Cliente digita `!care` ou qualquer mensagem
- Bot apresenta saudação personalizada por horário
- Solicita CPF/CNPJ para identificação

### Processo de Autenticação
- Cliente informa CPF/CNPJ
- Bot valida formato e consulta base IXC
- Se encontrado: armazena dados do cliente e prossegue
- Se não encontrado: 
  - Permite 2 tentativas adicionais
  - Após 3 tentativas, direciona para atendente humano

### Confirmação de Identidade
- Bot confirma dados básicos (nome, endereço)
- Cliente confirma com "Sim" ou corrige informação
- Estabelece sessão autenticada

---

## Menu Principal (Pós-Autenticação)

**Apresentação do Menu:**
```
Olá [Nome do Cliente]! 
Como posso ajudar hoje?

1️⃣ Situação Financeira
2️⃣ Minha Conexão  
3️⃣ Suporte Técnico
4️⃣ Atualizar Dados
5️⃣ Falar com Atendente
```

---

## 1. Workflow - Situação Financeira

### Submenu Financeiro:
```
💰 Situação Financeira
1️⃣ Ver faturas em aberto
2️⃣ Segunda via de boleto
3️⃣ Confirmar pagamento
4️⃣ Histórico de pagamentos
🔙 Voltar ao menu principal
```

### Fluxos Específicos:

**Ver Faturas em Aberto:**
- Lista todas as faturas pendentes
- Mostra valor, vencimento e status
- Oferece opções: pagar agora, segunda via, ou voltar

**Segunda Via:**
- Cliente escolhe qual fatura (se múltiplas)
- Bot gera e envia PDF do boleto
- Oferece copiar código de barras
- Pergunta se precisa de mais alguma coisa

**Confirmar Pagamento:**
- Cliente informa que pagou
- Bot consulta status na API
- Se confirmado: parabeniza e atualiza status
- Se não confirmado: informa prazo de processamento
- Se conexão bloqueada: oferece liberação manual

**Histórico:**
- Mostra últimos 6 meses de pagamentos
- Cliente pode solicitar período específico
- Oferece envio por email se necessário

---

## 2. Workflow - Minha Conexão

### Submenu Conexão:
```
🌐 Status da Conexão
1️⃣ Verificar status atual
2️⃣ Teste de velocidade
3️⃣ Reiniciar conexão
4️⃣ Histórico de instabilidades
🔙 Voltar ao menu principal
```

### Fluxos Específicos:

**Status Atual:**
- Consulta API e mostra: Online/Offline
- Se online: mostra há quanto tempo
- Se offline: mostra desde quando e possível causa
- Oferece soluções baseadas no problema

**Teste de Velocidade:**
- Orienta como fazer teste
- Solicita resultado do cliente
- Compara com plano contratado
- Se discrepante: oferece soluções ou agenda técnico

**Reiniciar Conexão:**
- Verifica se função está disponível na API
- Se sim: executa reinício e acompanha status
- Se não: orienta reinício manual do equipamento
- Aguarda confirmação de funcionamento

---

## 3. Workflow - Suporte Técnico

### Submenu Suporte:
```
🔧 Suporte Técnico
1️⃣ Problemas frequentes
2️⃣ Diagnóstico guiado
3️⃣ Agendar visita técnica
4️⃣ Chamados abertos
🔙 Voltar ao menu principal
```

### Diagnóstico Inteligente:

**Triagem Inicial:**
- "Qual o problema que está enfrentando?"
- Cliente descreve em texto livre
- Bot identifica palavras-chave e direciona

**Problemas Frequentes:**
- Internet lenta → Fluxo teste velocidade
- Sem internet → Fluxo verificação status
- WiFi não funciona → Orientações técnicas
- Equipamento com problema → Agenda técnico

**Diagnóstico Guiado:**
1. Verifica se equipamentos estão ligados
2. Testa conectividade básica
3. Orienta reinicializações
4. Verifica cabos e conexões
5. Se não resolve: escala para técnico

---

## 4. Workflow - Atualizar Dados

### Submenu Dados:
```
📝 Atualizar Dados
1️⃣ Telefone de contato
2️⃣ Email
3️⃣ Endereço de cobrança
4️⃣ Data de vencimento
🔙 Voltar ao menu principal
```

### Processo de Atualização:
- Cliente escolhe o que quer alterar
- Bot mostra dado atual
- Solicita novo dado com validações
- Confirma alteração
- Atualiza via API IXC
- Confirma sucesso da operação

---

## Fluxos Transversais

### Escalação para Atendente:
- Disponível em qualquer momento
- Cliente digita "atendente" ou escolhe opção
- Bot coleta contexto da conversa
- Transfere com resumo do que foi discutido

### Timeout e Limpeza:
- Após 10 minutos de inatividade: aviso
- Após 15 minutos: encerra sessão
- Cliente pode retomar digitando qualquer coisa

### Tratamento de Mensagens Livres:
- Bot analisa contexto da mensagem
- Tenta direcionar para fluxo apropriado
- Se não consegue interpretar: oferece menu
- Sempre mantém tom amigável

### Saídas de Emergência:
- "Menu" volta ao principal
- "Início" reinicia conversa
- "Atendente" escala imediatamente
- "Ajuda" mostra comandos disponíveis

---

## Considerações de Experiência

### Personalização:
- Usar nome do cliente nas mensagens
- Lembrar preferências da conversa
- Adaptar linguagem ao perfil (pessoa física/jurídica)

### Eficiência:
- Máximo 3 cliques para qualquer ação
- Sempre mostrar progresso em fluxos longos
- Confirmar ações importantes antes de executar

### Humanização:
- Usar emojis apropriados
- Manter tom conversacional
- Reconhecer frustração e ser empático
- Oferecer alternativas quando algo não funciona

---

## Estado do Usuário (Estrutura de Dados)

```
Estado do Usuário = {
  chatId: string,
  step: number,
  currentFlow: 'main' | 'payment' | 'support' | 'billing' | 'connection',
  data: {
    clientId?: string,
    cpfCnpj?: string,
    contractId?: string,
    clientName?: string,
    // outros dados temporários
  },
  lastActivity: Date,
  authenticated: boolean,
  authAttempts: number
}
```

## Tratamento de Erros

### API IXC Indisponível:
- Informa problema técnico temporário
- Oferece falar com atendente
- Agenda callback se possível

### Dados Inválidos:
- Solicita novamente com limite de tentativas
- Oferece ajuda com formato correto
- Escala para atendente após múltiplas tentativas

### Erros Inesperados:
- Mensagem amigável de desculpas
- Log completo para debugging
- Sempre oferece alternativa (atendente)