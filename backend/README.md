# Pluvial · motor lógico em Python

Challenge FIAP 2026 · Sprint 2 · **Computational Thinking with Python**

Programa de terminal que simula as regras centrais do Pluvial, a solução do grupo para os problemas causados pelas chuvas em **Juiz de Fora (MG)**: classificação de risco por bairro (chuva acumulada + nível da água medido pelo sensor no bueiro), alerta confirmado pela Defesa Civil e gamificação comunitária para incentivar a prevenção.

Nesta sprint não há sensores nem APIs: as leituras são digitadas pelo usuário ou já começam cadastradas no código.

> **Tudo é demonstração.** Os bairros são reais, mas abrigos, ruas, moradores, leituras e limites de risco são fictícios.

## Integrantes

| Nome completo | RM |
|---|---|
| Anauã Paulo Campolina Vieitas Lima | RM576103 |
| Arthur Deocleciano de Araujo | RM574299 |
| Bruno Smoktunowicz Baptista | RM574739 |
| Caio Medeiros Machado | RM575113 |
| Guilherme Stock de Carvalho | RM573464 |

## Como executar

Requer **Python 3.10 ou superior** (o programa usa `match-case`). Não usa bibliotecas externas.

A partir da raiz do repositório:

```bash
cd backend
python pluvial.py
```

## Funcionalidades

O menu volta a aparecer depois de cada opção, até o usuário escolher **0 (Sair)**.

| Opção | O que faz |
|---|---|
| 1. Registrar leitura do sensor | Recebe a chuva de hoje (mm) e o nível da água no bueiro (cm) de um bairro, atualiza a matriz e mostra o risco e a orientação (abrigo e rua a evitar). |
| 2. Disparar alerta | O sistema sugere o alerta e **o operador da Defesa Civil confirma (S/N)**. Se confirmar, envia um WhatsApp simulado aos moradores do bairro. |
| 3. Estatísticas de chuva | Mostra a matriz de chuva (bairros × 7 dias) com total, média, maior e menor valor de cada bairro. |
| 4. Registrar missão | Soma os pontos de uma missão de prevenção (lixo, bueiro, plantio ou mutirão) e mostra o nível do morador. |
| 5. Ranking comunitário | Ordena os moradores do maior para o menor número de pontos. |

## Regras de negócio (fictícias)

O risco do bairro é o **maior** nível alcançado pela chuva acumulada em 72 h (soma dos 3 últimos dias da matriz) ou pelo nível da água no bueiro:

| Nível | Chuva em 72 h | Água no bueiro | Orientação |
|---|---|---|---|
| NORMAL | abaixo de 50 mm | abaixo de 30 cm | Manter bueiros e calhas limpos |
| ATENÇÃO | a partir de 50 mm | a partir de 30 cm | Evitar a rua de risco do bairro |
| ALERTA | a partir de 90 mm | a partir de 60 cm | Preparar-se e ir para o abrigo |
| EMERGÊNCIA | a partir de 140 mm | a partir de 100 cm | Sair agora para o abrigo |

**Princípio do Pluvial:** o sistema calcula e sugere, mas um operador da Defesa Civil sempre confirma o alerta, para evitar alarme falso.

**Níveis da comunidade:** Vizinho (0 a 29 pts), Guardião (30 a 79) e Sentinela (80 ou mais).

## Conceitos aplicados

- **Menu com `while`** e `match-case` para escolher a funcionalidade.
- **Regras com `if/elif/else` e `match-case`**: `classificar_risco`, `orientacao` e `nivel_comunidade`.
- **Validação de entrada** com `isdigit()` (junto com `isascii()`, para recusar símbolos como ² e ³), faixa permitida, opção existente e S/N (também aceita SIM e NÃO); entrada inválida nunca encerra o programa.
- **Listas** (bairros, abrigos, moradores, pontos, missões) e **matriz** de chuva (bairros × dias).
- **Laços `for`/`while`**: `for` nas estatísticas de cada bairro e no ranking, ordenado à mão (bubble sort); `while` no menu e nas leituras; `continue` para pedir a entrada de novo e para avisar só os moradores do bairro; `break` para sair do menu.
- **Funções com parâmetros e `return`**, como `classificar_risco(chuva_mm, nivel_cm)`, `estatisticas(valores)` e `escolher(titulo, itens)`.
- **Saídas com f-string**, nomes claros, comentários e PEP 8.

## Uso de IA

IA generativa foi usada como apoio. Todos os prompts estão em [`prompts.md`](prompts.md).
