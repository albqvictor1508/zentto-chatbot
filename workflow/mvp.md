# Workflow MVP - Bot de Atendimento IXC (Versão Simplificada)

## Objetivo
Lançar um MVP funcional com as funcionalidades mais essenciais e que geram maior impacto no atendimento ao cliente.

---

## Fluxo Básico de Entrada

### Comandos de Início
- `!care` → Inicia atendimento
- Qualquer outra mensagem → Orienta a usar `!care`

### Saudação Inicial
```
Bom dia/Boa tarde! 👋 
Sou o Zentto, seu assistente virtual!

Para começar, preciso do seu CPF ou CNPJ:
```

### Processo de Identificação (Simplificado)
1. Cliente informa CPF/CNPJ
2. Bot valida formato básico
3. Consulta API IXC para buscar cliente
4. Se encontrado: confirma nome e segue
5. Se não encontrado: direciona para atendente

---

## Menu Principal (MVP)

```
Olá [Nome]! Como posso ajudar?

1️⃣ Segunda via do boleto
2️⃣ Confirmar pagamento  
3️⃣ Status da minha internet
4️⃣ Falar com atendente

Digite o número da opção desejada.
```

---

## 1. Segunda Via do Boleto

### Fluxo Simples:
1. Cliente escolhe opção "1"
2. Bot consulta faturas em aberto na API IXC
3. **Se tem apenas 1 fatura:**
   - Gera e envia PDF automaticamente
   - Mostra dados: valor, vencimento
   - Oferece copiar código de barras
4. **Se tem múltiplas faturas:**
   - Lista as faturas com números
   - Cliente escolhe qual quer
   - Gera e envia PDF da escolhida
5. **Se não tem faturas em aberto:**
   - Informa que não há pendências
   - Oferece outras opções do menu

### Fim do Fluxo:
- Pergunta se precisa de mais alguma coisa
- Volta ao menu principal

---

## 2. Confirmar Pagamento

### Fluxo Simples:
1. Cliente escolhe opção "2"
2. Bot pergunta: "Qual fatura você pagou?"
3. **Se tem apenas 1 fatura em aberto:**
   - Confirma automaticamente qual fatura
4. **Se tem múltiplas:**
   - Lista as faturas pendentes
   - Cliente escolhe qual pagou
5. Bot consulta status na API IXC
6. **Se pagamento confirmado:**
   - Parabeniza o cliente
   - Informa que conta está em dia
7. **Se pagamento não confirmado:**
   - Informa prazo de processamento (até 2 dias úteis)
   - Orienta sobre compensação bancária

### Fim do Fluxo:
- Volta ao menu principal

---

## 3. Status da Internet

### Fluxo Simples:
1. Cliente escolhe opção "3"
2. Bot consulta status na API IXC
3. **Se conexão online:**
   - "Sua internet está funcionando normalmente ✅"
   - Mostra há quanto tempo está online
4. **Se conexão offline:**
   - "Identifiquei que sua co