# Pluvial
# Challenge FIAP 2026 - Sprint 2 - Computational Thinking with Python
# Anauã Paulo Campolina Vieitas Lima · RM576103
# Arthur Deocleciano de Araújo · RM574299
# Bruno Smoktunowicz Baptista · RM574739
# Caio Medeiros Machado · RM575113
# Guilherme Stock de Carvalho · RM573464

# Níveis de risco, do mais leve ao mais grave
NIVEIS = ["NORMAL", "ATENÇÃO", "ALERTA", "EMERGÊNCIA"]

# Dados fictícios: a mesma posição em cada lista é o mesmo bairro
bairros = ["Santa Terezinha", "Dom Bosco", "Vila Ideal", "Linhares",
           "Borboleta"]
abrigos = ["Escola municipal", "Ginásio poliesportivo", "Centro comunitário",
           "Escola estadual", "Ginásio poliesportivo"]
ruas_evitar = ["Ladeira da encosta", "Escadaria do morro", "Rua do córrego",
               "Travessa da baixada", "Rua do barranco"]
nivel_bueiro = [20, 35, 15, 10, 25]

# Matriz de chuva em mm: 5 bairros x 7 dias (a última coluna é hoje)
chuva = [
    [12, 0, 25, 30, 18, 22, 10],
    [8, 15, 40, 35, 28, 30, 12],
    [0, 5, 10, 20, 15, 12, 8],
    [3, 0, 8, 12, 10, 9, 5],
    [10, 12, 30, 22, 25, 20, 15],
]

# Moradores, o bairro de cada um e seus pontos
moradores = ["Ana Souza", "Bruno Lima", "Carla Dias", "Diego Rocha",
             "Elisa Prado"]
bairro_morador = [1, 1, 0, 2, 4]
pontos = [42, 18, 95, 7, 31]

# Missões de prevenção e quantos pontos cada uma vale
missoes = ["Descartar lixo no ponto de coleta", "Relatar bueiro entupido",
           "Plantar uma muda de árvore", "Participar de mutirão de limpeza"]
pontos_missao = [5, 8, 15, 20]


# Lê um número inteiro dentro da faixa, repetindo até ser válido
def ler_inteiro(mensagem, minimo, maximo):
    while True:
        texto = input(mensagem).strip()
        if not (texto.isascii() and texto.isdigit()):
            print("Digite apenas números inteiros.")
            continue
        valor = int(texto)
        if minimo <= valor <= maximo:
            return valor
        print(f"Digite um valor de {minimo} a {maximo}.")


# Lê uma resposta S ou N
def ler_sim_nao(mensagem):
    while True:
        resposta = input(mensagem).strip().upper()
        if resposta in ("S", "SIM"):
            return True
        if resposta in ("N", "NAO", "NÃO"):
            return False
        print("Responda S ou N.")


# Mostra uma lista numerada e devolve a posição escolhida
def escolher(titulo, itens):
    print(f"\n{titulo}")
    for i in range(len(itens)):
        print(f"{i + 1}. {itens[i]}")
    return ler_inteiro("Escolha: ", 1, len(itens)) - 1


# Soma a chuva dos últimos 3 dias (72 h) de um bairro
def chuva_72h(bairro):
    return sum(chuva[bairro][-3:])


# Classifica o risco pela chuva de 72 h e pelo nível do bueiro
def classificar_risco(chuva_mm, nivel_cm):
    if chuva_mm >= 140 or nivel_cm >= 100:
        return 3
    elif chuva_mm >= 90 or nivel_cm >= 60:
        return 2
    elif chuva_mm >= 50 or nivel_cm >= 30:
        return 1
    else:
        return 0


# Devolve a orientação ao morador conforme o risco
def orientacao(risco, bairro):
    match risco:
        case 0:
            return "Sem risco. Mantenha bueiros e calhas limpos."
        case 1:
            return f"Fique atento e evite a {ruas_evitar[bairro]}."
        case 2:
            return f"Prepare-se para sair. Abrigo: {abrigos[bairro]}."
        case _:
            return (f"SAIA AGORA! Vá para {abrigos[bairro]} e não passe "
                    f"pela {ruas_evitar[bairro]}.")


# Mostra o risco e a orientação de um bairro
def mostrar_situacao(bairro):
    risco = classificar_risco(chuva_72h(bairro), nivel_bueiro[bairro])
    print(f"\n{bairros[bairro]}: chuva 72 h = {chuva_72h(bairro)} mm, "
          f"bueiro = {nivel_bueiro[bairro]} cm")
    print(f"Risco {NIVEIS[risco]}: {orientacao(risco, bairro)}")
    return risco


# Devolve o nível do morador conforme os pontos
def nivel_comunidade(total):
    if total >= 80:
        return "Sentinela"
    elif total >= 30:
        return "Guardião"
    else:
        return "Vizinho"


# Calcula total, média, maior e menor valor de uma lista
def estatisticas(valores):
    total = 0
    maior = valores[0]
    menor = valores[0]
    for valor in valores:
        total += valor
        if valor > maior:
            maior = valor
        if valor < menor:
            menor = valor
    return total, total / len(valores), maior, menor


# Opção 1: registra a leitura do sensor e mostra o risco
def registrar_leitura():
    bairro = escolher("Bairros:", bairros)
    chuva[bairro][-1] = ler_inteiro("Chuva de hoje (0 a 400 mm): ", 0, 400)
    nivel_bueiro[bairro] = ler_inteiro("Nível do bueiro (0 a 300 cm): ",
                                       0, 300)
    mostrar_situacao(bairro)


# Opção 2: sugere o alerta e só envia se o operador confirmar
def disparar_alerta():
    bairro = escolher("Bairros:", bairros)
    risco = mostrar_situacao(bairro)
    if risco == 0:
        print("Sem motivo para alerta.")
    elif ler_sim_nao("Operador, confirma o alerta? (S/N): "):
        avisados = 0
        for i in range(len(moradores)):
            if bairro_morador[i] != bairro:
                continue
            print(f"[SIMULAÇÃO] WhatsApp para {moradores[i]}: "
                  f"{NIVEIS[risco]} - {orientacao(risco, bairro)}")
            avisados += 1
        if avisados == 0:
            print("Nenhum morador cadastrado neste bairro.")
    else:
        print("Alerta cancelado pelo operador.")


# Opção 3: mostra a chuva de cada bairro com as estatísticas
def mostrar_estatisticas():
    print("\nChuva dos últimos 7 dias (mm):")
    for i in range(len(bairros)):
        total, media, maior, menor = estatisticas(chuva[i])
        print(f"{bairros[i]:<16}{chuva[i]} total {total} | média "
              f"{media:.1f} | maior {maior} | menor {menor}")


# Opção 4: registra uma missão e soma os pontos do morador
def registrar_missao():
    morador = escolher("Moradores:", moradores)
    missao = escolher("Missões:", missoes)
    pontos[morador] += pontos_missao[missao]
    print(f"\n+{pontos_missao[missao]} pontos! {moradores[morador]} tem "
          f"{pontos[morador]} pts ({nivel_comunidade(pontos[morador])}).")


# Opção 5: mostra o ranking dos moradores por pontos
def exibir_ranking():
    ordem = list(range(len(moradores)))
    for i in range(len(ordem) - 1):
        for j in range(len(ordem) - 1 - i):
            if pontos[ordem[j + 1]] > pontos[ordem[j]]:
                ordem[j], ordem[j + 1] = ordem[j + 1], ordem[j]
    print("\nRanking comunitário:")
    for posicao in range(len(ordem)):
        i = ordem[posicao]
        print(f"{posicao + 1}. {moradores[i]:<13}{pontos[i]:>4} pts  "
              f"{nivel_comunidade(pontos[i])}")


# Função principal com o menu
def main():
    while True:
        print("\n=== PLUVIAL (dados fictícios) ===")
        print("1. Registrar leitura do sensor")
        print("2. Disparar alerta")
        print("3. Estatísticas de chuva")
        print("4. Registrar missão")
        print("5. Ranking comunitário")
        print("0. Sair")
        match ler_inteiro("Opção: ", 0, 5):
            case 1:
                registrar_leitura()
            case 2:
                disparar_alerta()
            case 3:
                mostrar_estatisticas()
            case 4:
                registrar_missao()
            case 5:
                exibir_ranking()
            case 0:
                print("Até logo!")
                break


# Inicia o programa e fecha sem erro se apertar Ctrl+C
if __name__ == "__main__":
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print("\nPrograma encerrado.")
