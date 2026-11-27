# Prompts de IA utilizados

Ferramenta: Claude (Anthropic), na aba Code do app Claude.

A IA foi usada como apoio. O grupo leu, revisou e testou todo o código antes da entrega. Os prompts estão na ordem em que foram usados, com o texto original.

## Prompt 1 · Base do programa

> vamos fazer nossa parte do trabalho do Challenge, vou te passar as especificações e requisitos do trabalho, vou ir escrevendo o código e solicitando ideias e suporte para você leia todo o pdf que eu anexei, me de ideias de como posso fazer e vou unindo nossas idéias

Anexo: PDF do Challenge 2026 (Sprints 1 e 2), com os requisitos da disciplina Computational Thinking with Python.

Resultado: planejamento da primeira versão de `pluvial.py` do `README.md` e deste arquivo.

## Prompt 2 · Revisão contra os requisitos

> Terminei de estruturar o código em Python aqui no vs code e queria fazer uma revisão completa com você antes de fechar esse primeiro protótipo. Não quero adicionar funcionalidades extras agora a ideia é focar estritamente nos requisitos que foram passados nos slides do trabalho e deixar tudo bem lapidado antes de partirmos para a integração com o site. Quero que você analise o meu código e me dê um feedback, verifica se está tudo alinhado com o enunciado, se os comentários no código são realmente necessários segundo os requisitos ou se devo limpar algo, e aponta qualquer ponto de atenção, bug lógico ou melhoria de formatação (como PEP 8). Como o prazo está apertado, faz uma bateria rigorosa de testes e revisa o código pelo menos 3 vezes para garantir que nada passou batido.

Resultado: revisão em três etapas (requisitos, testes de lógica com entradas aleatórias e PEP 8). apontou alguns ajustes necessários no meu código: um bug com os símbolos 2 e 3 na leitura de números, linhas acima de 79 caracteres, além de nomes/RMs faltando no README e o registro deste prompt. Também confirmou que os comentários são exigidos pelos requisitos, mantendo a documentação original.

## Prompt 3 · Ajustes e padronização

> Já apliquei as correções principais nos bugs que você apontou, mas queria a sua ajuda para dar uma limpada geral no código e garantir que nada fugiu dos requisitos. Dá uma revisada na formatação (PEP 8)


Resultado: validação final do erro com 2 e 3, ajustes de formatação (PEP 8), reforço na validação de nomes com letras, substituição de números soltos por constantes, alinhamento do texto de "nível da água no bueiro" ao escopo da Sprint.


## Prompt 4 · Testes Finais

> agora com o protótipo final do código quero que revise os requisitos se está tudo de acordo e faça testes de todas as formas no código para conferir se a entrega está de acordo e não tem nenhuma ponta solta no código, os testes devem ser feitos de diferentes modos garantindo a exelencia do codigo.

Resultado: após a validação do claude, me mostrou um erro que dava quando digitava numeros ao inves de letras em certas partes do menu de interação, após isso tudo ficou correto e passou pelos testes.