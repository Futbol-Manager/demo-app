const fs = require('fs');
const path = require('path');
const outPath = path.join(__dirname, '..', 'src', 'assets', 'i18n', 'pt.json');
const pt = JSON.parse(fs.readFileSync(outPath, 'utf8'));

// Add all missing sections

pt["CAL"] = {
"TEXT_001":"Local","TEXT_002":"Visitante","TEXT_003":"Ícone de Treino","TEXT_004":"Ícone de Jogo",
"TEXT_005":"Exemplo: Equipamento verde, garrafa de água, etc","TEXT_006":"Pontos fortes","TEXT_007":"Pontos fracos",
"TEXT_008":"Jogadores chave (Nome, Posição, Dorsal, Comentários, etc)","TEXT_009":"Estilo de jogo (Posição, transição, pressão, etc)",
"TEXT_010":"Últimos resultados (Data, adversário, resultado)","TEXT_011":"Formações recentes (4-3-3, 4-4-2, etc)",
"TEXT_012":"Padrões Ofensivos (Ataque pelas alas, Ataque pelo centro, etc)","TEXT_013":"Padrões Defensivos (Bloco baixo, médio, alto, etc)",
"TEXT_014":"Estatísticas (golos a favor, contra, golos por jogo, sofridos por jogo, etc)",
"TEXT_015":"Tendências Táticas (Mudanças de formação durante o jogo, substituições habituais, etc)",
"TEXT_016":"Dados Individuais Importantes (Guarda-redes, Defesas, Médio, Avançados)",
"TEXT_017":"Bolas paradas (Cantos, Livres, Laterais, etc)","TEXT_018":"Formação Inicial (4-4-2, 4-3-3, etc)",
"TEXT_019":"Plano de Jogo em Ataque (subida pelas alas, bolas longas, etc)",
"TEXT_020":"Plano de Jogo em Defesa (Bloco baixo, médio, alto, pressão após perda, etc)",
"TEXT_021":"Transições Ofensivas (rapidez com bola longa, reinício de jogo, etc)",
"TEXT_022":"Transições Defensivas (Pressão após perda, recuo rápido, etc)",
"TEXT_023":"Bolas Paradas Ofensivas (Jogadas ensaiadas, cruzamentos para a área, etc)",
"TEXT_024":"Bolas Paradas Defensivas (Marcação individual, por zona, quem liberta, rejeição, etc)",
"TEXT_025":"Funções Específicas (Capitão, batedor de livres, de penáltis, cantos, jogadores de barreira, etc)",
"TEXT_026":"Ajustes Táticos (Mudança de formação, adaptações durante o jogo, alterações conforme situações do jogo, etc)",
"TEXT_027":"Bolas Paradas Ofensivas (Jogadas ensaiadas, cruzamentos para a área, etc)",
"TEXT_028":"Se não estiver visível o jogador não o verá","TEXT_029":"Título","TEXT_030":"Tempo","TEXT_031":"Espaço",
"TEXT_032":"Descrição","TEXT_033":"Regras","TEXT_034":"Variantes","TEXT_035":"Material","TEXT_036":"Vídeo YouTube",
"TEXT_037":"Imagem da tarefa","TEXT_038":"Imagem padrão","TEXT_039":"ex. motivador, stressante, colaborativo",
"TEXT_040":"(ex. contente, ansioso, frustrado)","TEXT_041":"(Breve descrição)","TEXT_042":"Indicar se vai assistir ou não ao jogo",
"TEXT_043":"Escreva o motivo da sua não comparência...","TEXT_044":"logo-sphaira","TEXT_045":"Imagem do Clube",
"TEXT_046":"Informação da equipa","TEXT_047":"Ver jogadores da equipa","TEXT_048":"Tarefas",
"TEXT_049":"Estatísticas da equipa","TEXT_050":"Estatísticas por jogador","TEXT_051":"Sem equipa não dispõe de Calendário",
"TEXT_052":"Mês Anterior","TEXT_053":"Mês Seguinte","TEXT_054":"Segunda-feira","TEXT_055":"Terça-feira",
"TEXT_056":"Quarta-feira","TEXT_057":"Quinta-feira","TEXT_058":"Sexta-feira","TEXT_059":"Sábado","TEXT_060":"Domingo",
"TEXT_061":"Adicionar","TEXT_062":"Treino","TEXT_063":"Cria um treino ou um jogo","TEXT_064":"Instruções",
"TEXT_065":"Escolha o separador desejado e decida se quer criar um treino ou um pré-jogo","TEXT_066":"Jogo",
"TEXT_067":"Conteúdo para Treino","TEXT_068":"Objetivo da Sessão:","TEXT_069":"Aquecimento:",
"TEXT_070":"Conteúdo para Jogo","TEXT_071":"Informação geral do jogo:","TEXT_072":"Tipo de jogo:",
"TEXT_073":"Amigável","TEXT_074":"Liga","TEXT_075":"Torneio","TEXT_076":"Nome do Adversário:","TEXT_077":"Local:",
"TEXT_078":"Hora de","TEXT_079":"encontro:","TEXT_080":"Local ou Visitante:","TEXT_081":"Hora do","TEXT_082":"jogo:",
"TEXT_083":"Nome do Árbitro:","TEXT_084":"Comentários do treinador:","TEXT_085":"Informação do Adversário:",
"TEXT_086":"Informação da minha equipa:","TEXT_087":"Nome\n                  do Adversário:","TEXT_088":"Hora do jogo:",
"TEXT_089":"Comentários do\n                    treinador:","TEXT_090":"Informação do\n                  Adversário:",
"TEXT_091":"Tática Geral:","TEXT_092":"Bolas Paradas Ofensivas:","TEXT_093":"Bolas Paradas Defensivas:",
"TEXT_094":"Titulares:","TEXT_095":"Suplentes:","TEXT_096":"Convocados:","TEXT_097":"Pré-formulário",
"TEXT_098":"Pós-formulário","TEXT_099":"Convocatória","TEXT_100":"Pós-Jogo","TEXT_101":"Imprimir",
"TEXT_102":"Visível/Não Visível","TEXT_103":"Abrir no Google Maps","TEXT_104":"Encontro:","TEXT_105":"Jogo:",
"TEXT_106":"Eliminar Jogo","TEXT_107":"Guardar\n            Jogo","TEXT_108":"Simples","TEXT_109":"Avançada",
"TEXT_110":"Golos a favor:","TEXT_111":"Golos contra:","TEXT_112":"Resultado:","TEXT_113":"Vitória",
"TEXT_114":"Empate","TEXT_115":"Derrota","TEXT_116":"Defesas do guarda-redes:","TEXT_117":"Remates a favor:",
"TEXT_118":"Remates contra:","TEXT_119":"Faltas cometidas:","TEXT_120":"Faltas sofridas:",
"TEXT_121":"Cantos a favor:","TEXT_122":"Cantos contra:","TEXT_123":"Penáltis a favor:",
"TEXT_124":"Penáltis contra:","TEXT_125":"Recuperações:","TEXT_126":"Perdas:","TEXT_127":"Cartões Amarelos:",
"TEXT_128":"Cartões Vermelhos:","TEXT_129":"Chegadas com perigo a favor:","TEXT_130":"Chegadas com perigo contra:",
"TEXT_131":"Anotações:","TEXT_132":"Vídeo YouTube:","TEXT_133":"Golos a\n                      favor",
"TEXT_134":"Golos\n                      contra","TEXT_135":"Especifica os golos a favor",
"TEXT_136":"Descrição golo 1","TEXT_137":"Golo de:","TEXT_138":"Seleciona uma opção","TEXT_139":"Assistência de:",
"TEXT_140":"Sem assistência","TEXT_141":"No minuto:","TEXT_142":"Categoria:",
"TEXT_143":"Clique para carregar as categorias","TEXT_144":"Opcional:","TEXT_145":"Cruzamento para a Área",
"TEXT_146":"Subcategoria:","TEXT_147":"Selecionar subcategoria","TEXT_148":"Opção:","TEXT_149":"Selecionar opção",
"TEXT_150":"Apagar","TEXT_151":"Guardado com sucesso","TEXT_152":"Eliminado com sucesso",
"TEXT_153":"Descrição golo 2","TEXT_154":"Descrição golo 3","TEXT_155":"Descrição golo 4",
"TEXT_156":"Descrição golo 5","TEXT_157":"Descrição golo 6","TEXT_158":"Descrição golo 7",
"TEXT_159":"Descrição golo 8","TEXT_160":"Descrição golo 9","TEXT_161":"Descrição golo 10",
"TEXT_162":"Especifica os golos contra","TEXT_ADD_GOAL":"Adicionar descrição de outro golo",
"TEXT_163":"Tipos de golos:","TEXT_164":"Anotações do jogador:","TEXT_165":"Estatísticas individuais:",
"TEXT_166":"Minutos:","TEXT_167":"Golos:","TEXT_168":"Assistências:","TEXT_169":"Golos de penálti:",
"TEXT_170":"Golos de livre:","TEXT_171":"Penáltis cometidos:","TEXT_172":"Penáltis sofridos:",
"TEXT_173":"Perdas:","TEXT_174":"Cartões amarelos:","TEXT_175":"Cartões vermelhos:",
"TEXT_176":"Remates totais:","TEXT_177":"Remates à baliza:","TEXT_178":"Penáltis falhados:",
"TEXT_179":"Defesas do guarda-redes:","TEXT_180":"Detalhes do Treino",
"TEXT_181":"Botão de fechar com um ícone","TEXT_182":"Eliminar\n                  Treino",
"TEXT_183":"Guardar Treino","TEXT_184":"Selecione estratégia...","TEXT_185":"Selecione intenção...",
"TEXT_186":"Carregar tarefa para a nuvem","TEXT_187":"Criar Tarefa","TEXT_188":"Ver","TEXT_189":"Eliminar",
"TEXT_190":"Adicionar\n                  Tarefa","TEXT_191":"Nuvem de\n                  Tarefas",
"TEXT_192":"Fechar\n                  Nuvem de Tarefas","TEXT_193":"Formulário Pré-Treino",
"TEXT_194":"Energia e Fadiga","TEXT_195":"Como classificarias o teu nível de energia hoje?",
"TEXT_196":"Sentes algum tipo de fadiga ou cansaço?","TEXT_197":"Dores e Lesões",
"TEXT_198":"Há alguma parte do teu corpo que te doa ou incomode hoje?\n                  (Descrição e classificação de 0 a 10)",
"TEXT_199":"Em caso de incómodo, afeta a tua capacidade para treinar ou\n                  jogar?",
"TEXT_200":"Sim","TEXT_201":"Não","TEXT_202":"Motivação",
"TEXT_203":"Quão motivado te sentes hoje para treinar?","TEXT_204":"Concentração",
"TEXT_205":"Como classificarias o teu nível de concentração hoje?","TEXT_206":"Estado de Espírito",
"TEXT_207":"Descreve o teu estado de espírito atual com palavras-chave (ex. contente,\n                  ansioso, frustrado).",
"TEXT_208":"Qualidade do Sono","TEXT_209":"Como classificarias a qualidade do teu sono ontem à noite?",
"TEXT_210":"Alimentação e Hidratação","TEXT_211":"Como classificarias o teu nível de hidratação hoje?",
"TEXT_212":"Consideras que a tua alimentação de hoje foi adequada para a tua\n                  atividade física?",
"TEXT_213":"Especifica que alimentos consumiste hoje.","TEXT_214":"Espaço Aberto para Comentários",
"TEXT_215":"Há algo mais que queiras partilhar sobre como te sentes física ou\n                  mentalmente?",
"TEXT_216":"Enviar","TEXT_217":"Formulário Pós-Treino","TEXT_218":"Perceção do Treino",
"TEXT_219":"Como descreverias o treino de hoje?","TEXT_220":"Aborrecido","TEXT_221":"Demasiado intenso",
"TEXT_222":"Divertido","TEXT_223":"Duro","TEXT_224":"Entretido","TEXT_225":"Fácil","TEXT_226":"Lento",
"TEXT_227":"Não se entendia","TEXT_228":"Pouco intenso","TEXT_229":"Objetivos",
"TEXT_230":"Achas que o treino de hoje cumpriu os seus\n                  objetivos?",
"TEXT_231":"Em caso de resposta negativa, o que achas que faltou?","TEXT_232":"Nível de Esforço e Cansaço",
"TEXT_233":"Que nível de cansaço sentes depois do treino?","TEXT_234":"Intensidade Percebida",
"TEXT_235":"Como classificarias a intensidade do treino de hoje?","TEXT_236":"Compreensão e Aprendizagem",
"TEXT_237":"Entendeste o propósito dos exercícios realizados hoje?","TEXT_238":"Aplicação",
"TEXT_239":"Sentes que podes aplicar o que aprendeste hoje num contexto de\n                  jogo?",
"TEXT_240":"Exercícios Preferidos","TEXT_241":"Qual foi o exercício que mais gostaste hoje e\n                  porquê?",
"TEXT_242":"Qual foi o exercício que menos gostaste hoje e\n                  porquê?","TEXT_243":"Ambiente de Trabalho",
"TEXT_244":"Como descreverias o ambiente durante o treino?","TEXT_245":"Comunicação",
"TEXT_246":"Como achas que foi a comunicação entre jogadores e\n                  treinadores durante o treino?",
"TEXT_247":"Há algo mais que queiras partilhar sobre o treino de\n                  hoje?",
"TEXT_248":"Formulário Pré-Jogo","TEXT_249":"Quão motivado te sentes hoje para jogar?",
"TEXT_250":"Descreve o teu estado de espírito atual com palavras-chave.","TEXT_251":"Expectativas",
"TEXT_252":"Que expectativas tens sobre o jogo de hoje?","TEXT_253":"Formulário Pós-Jogo",
"TEXT_254":"Físico","TEXT_255":"Que nível de cansaço sentes depois do jogo?",
"TEXT_256":"Contribuição para a Equipa","TEXT_257":"Como classificarias a tua contribuição para a equipa hoje?",
"TEXT_258":"Realidade","TEXT_259":"Achas que cumpriste as tuas expectativas? Porquê sim ou porquê\n                  não?",
"TEXT_260":"Opinião do jogo","TEXT_261":"O que achas do jogo em geral? Faz uma reflexão sobre o que aconteceu\n                  no jogo de hoje.",
"TEXT_262":"Formulário do Pré-Treino","TEXT_263":"Como classificarias o teu nível de energia hoje?:",
"TEXT_264":"Sentes algum tipo de fadiga ou cansaço?:",
"TEXT_265":"Há alguma parte do teu corpo que te doa ou incomode hoje?:",
"TEXT_266":"Em caso de incómodo, afeta a tua capacidade para treinar ou jogar?:",
"TEXT_267":"Quão motivado te sentes hoje para treinar?:",
"TEXT_268":"Como classificarias o teu nível de concentração hoje?:",
"TEXT_269":"Descreve o teu estado de espírito atual com palavras-chave (ex. contente, ansioso, frustrado):",
"TEXT_270":"Como classificarias a qualidade do teu sono ontem à noite?:",
"TEXT_271":"Como classificarias o teu nível de hidratação hoje?:",
"TEXT_272":"Consideras que a tua alimentação de hoje foi adequada para a tua atividade física?:",
"TEXT_273":"Especifica que alimentos consumiste hoje:",
"TEXT_274":"Há algo mais que queiras partilhar sobre como te sentes física ou mentalmente?:",
"TEXT_275":"Formulário do Pós-Treino","TEXT_276":"Como descreverias o treino de hoje?:",
"TEXT_277":"Achas que o treino de hoje cumpriu os seus objetivos?:",
"TEXT_278":"Em caso de resposta negativa, o que achas que faltou?:",
"TEXT_279":"Que nível de cansaço sentes depois do treino?:",
"TEXT_280":"Como classificarias a intensidade do treino de hoje?:",
"TEXT_281":"Entendeste o propósito dos exercícios realizados hoje?:",
"TEXT_282":"Sentes que podes aplicar o que aprendeste hoje num contexto de jogo?:",
"TEXT_283":"Qual foi o exercício que mais gostaste hoje e porquê?:",
"TEXT_284":"Qual foi o exercício que menos gostaste hoje e porquê?:",
"TEXT_285":"Como descreverias o ambiente durante o treino?:",
"TEXT_286":"Como achas que foi a comunicação entre jogadores e treinadores durante o\n                          treino?:",
"TEXT_287":"Há algo mais que queiras partilhar sobre o treino de hoje?:",
"TEXT_288":"Formulário do Pré-Jogo","TEXT_289":"Quão motivado te sentes hoje para jogar?:",
"TEXT_290":"Especifica que alimentos consumiste hoje.:",
"TEXT_291":"Que expectativas tens sobre o jogo de hoje?:","TEXT_292":"Formulário do Pós-Jogo",
"TEXT_293":"Que nível de cansaço sentes depois do jogo?:",
"TEXT_294":"Como classificarias a tua contribuição para a equipa hoje?:",
"TEXT_295":"Achas que cumpriste as tuas expectativas? Porquê sim ou porquê não?:",
"TEXT_296":"O que achas do jogo em geral?:","TEXT_297":"Assiduidade dos jogadores",
"TEXT_298":"Modifica qualquer campo do jogador para atualizar a sua informação. Podes selecionar o valor da\n              multa e descrever o motivo.",
"TEXT_299":"Atraso","TEXT_300":"Detalhes da Tarefa","TEXT_301":"Estratégia:","TEXT_302":"Intenção:",
"TEXT_303":"Descrição:","TEXT_304":"Regras:","TEXT_305":"Variantes:","TEXT_306":"Tempo de Trabalho:",
"TEXT_307":"Espaço:","TEXT_308":"Material:",
"TEXT_309":"Podes criar a tarefa num quadro e carregar depois a imagem","TEXT_310":"Abrir quadro",
"TEXT_311":"ou também podes","TEXT_312":"ir à aplicação",
"TEXT_313":"Carrega agora a imagem descarregada do teu quadro","TEXT_314":"Selecionar imagem:",
"TEXT_315":"Carregar imagem","TEXT_316":"Fechar","TEXT_317":"Gestão de Convocatória",
"TEXT_318":"Não Convocados","TEXT_319":"Suplentes","TEXT_320":"Titulares","TEXT_370":"Lesionados",
"TEXT_321":"Repor","TEXT_322":"Pré-aviso","TEXT_323":"Notificar",
"TEXT_324":"Não comparência / Comparência","TEXT_325":"Motivo de não comparência:",
"TEXT_326":"DISPONÍVEIS","TEXT_327":"NÃO DISPONÍVEIS","TEXT_328":"Imprimir em pdf",
"TEXT_329":"Gerar PDF","TEXT_330":"Relatório do Jogo","TEXT_331":"Nome do adversário",
"TEXT_332":"Local ou visitante","TEXT_333":"Hora","TEXT_334":"Nome do árbitro",
"TEXT_335":"Local do encontro","TEXT_336":"Informação do adversário","TEXT_337":"Estilo de jogo",
"TEXT_338":"Últimos Resultados","TEXT_339":"Formações recentes","TEXT_340":"Padrões ofensivos",
"TEXT_341":"Padrões defensivos","TEXT_342":"Estatísticas","TEXT_343":"Tendências táticas",
"TEXT_344":"Dados individuais","TEXT_345":"bpAdversário","TEXT_346":"Informação da minha equipa",
"TEXT_347":"Formação Inicial","TEXT_348":"Plano de jogo em ataque","TEXT_349":"Plano de Jogo em Defesa",
"TEXT_350":"Transições ofensivas","TEXT_351":"Transições defensivas","TEXT_352":"BP ofensivas",
"TEXT_353":"BP defensivas","TEXT_354":"Funções específicas","TEXT_355":"Ajustes táticos",
"TEXT_356":"Podes adicionar aqui comentários",
"TEXT_357":"Se não vês a tua classificação, avisa-nos enviando-nos um WhatsApp, indicando a federação a que pertences, a tua categoria e o teu grupo para: +34 623 91 17 72",
"TEXT_358":"Ver ata do jogo","TEXT_359":"Últimos 5","TEXT_360":"Ata do jogo","TEXT_361":"Cartões",
"TEXT_362":"Os dados de competições mostrados provêm de fontes públicas da Federação de Futebol. A Sphaira apenas reproduz informação disponível publicamente e não é responsável pela sua exatidão nem pela sua atualização.",
"TEXT_363":"O pagamento foi eliminado, mas existem registos no histórico, todos os registos realizados desse pagamento serão eliminados.",
"TEXT_364":"A federação não disponibilizou os dados, espere e tente novamente mais tarde.",
"TEXT_365":"Por favor, preencha todos os campos.",
"TEXT_366":"Esse email já está registado, tente iniciar sessão ou registe-se com um email diferente.",
"TEXT_367":"Permite mostrar esta informação aos jogadores","TEXT_368":"Informação visível para jogadores",
"TEXT_369":"Informação Adversário/Minha equipa visível para jogadores",
"TEXT_371":"Ano","TEXT_372":"Mês","TEXT_373":"Semana","TEXT_374":"Semana anterior","TEXT_375":"Semana seguinte",
"TEXT_376":"Ano anterior","TEXT_377":"Ano seguinte","TEXT_378":"Seg","TEXT_379":"Ter","TEXT_380":"Qua",
"TEXT_381":"Qui","TEXT_382":"Sex","TEXT_383":"Sáb","TEXT_384":"Dom","TEXT_385":"Ant.","TEXT_386":"Seg."
};

pt["REGISTER"] = {
"TITLE":"Registo de utilizador","SELECT_USER_TYPE":"Selecione o tipo de utilizador","REGISTER":"Registar-se",
"USER_TYPE":{
  "CLUB":{"TITLE":"Clube","NAME":"Nome do Clube","SUBTITLE":"Registar-se como clube desportivo",
    "MODAL":{"WARNING_PREFIX":"Este registo é","WARNING_HIGHLIGHT_1":"EXCLUSIVAMENTE PARA ENTIDADES DESPORTIVAS","WARNING_HIGHLIGHT_3":"EXCLUSIVAMENTE PARA TREINADORES","WARNING_MIDDLE":"Se é um","WARNING_HIGHLIGHT_2":"PAI/MÃE/TUTOR, ESTE NÃO É O SEU REGISTO","WARNING_SUFFIX":"Fale com o seu clube para receber o link de registo"}},
  "COACH":{"TITLE":"Treinador","SUBTITLE":"Registar-se como treinador"}
},
"TABS":{"PARENT":"Dados do pai/mãe","CHILDREN":"Dados dos filhos"},
"PARENT":{"QUESTION":"É pai, mãe, tutor ou jogador maior de idade?","RELATION":"Introduza os seus dados como:","FATHER":"Pai","MOTHER":"Mãe","TUTOR":"Tutor","ADULT":"Jogador maior de idade"},
"CHILDREN":{"TITLE":"Dados dos filhos","COUNT":"Quantos filhos jogam neste clube?","DATA":"Dados do filho {{num}}","CHECK_PLAYER":"Verificar se este jogador existe"},
"COMMON":{"NEXT":"Seguinte","BACK":"Voltar","FINISH":"Finalizar","EMAIL":"Correio eletrónico","EMAIL_REPEAT":"Repita o correio","PASSWORD":"Palavra-passe","BIRTHDATE":"Data de nascimento","NAME":"Nome","SURNAME":"Apelido","GENDER":"Selecione o seu género","PHONE":"Telefone","REPEAT_PASSWORD":"Repita a palavra-passe","HELP":"Se tiver alguma dúvida, contacte","TERMS_PREFIX":"Aceito a","TERMS_LINK":"política de privacidade","COMMS_PREFIX":"Aceito as","COMMS_LINK":"comunicações comerciais","WHATSAPP":"ou pelo WhatsApp",
  "GENDER_OPTIONS":{"MALE":"Masculino","FEMALE":"Feminino","OTHER":"Outro"}},
"VALIDATION":{"PLAYER_VALID":"Jogador validado","PLAYER_EXISTS":"O jogador já existe!"},
"AUTH":{"ALREADY_HAVE_ACCOUNT":"Já tem uma conta?","LOGIN_HERE":"Inicie sessão aqui"},
"MESSAGE":{"ATTENTION":"Atenção","PLAYER_MS":"Se é JOGADOR, espere que o seu treinador / clube o convide."},
"ERROR":{"PASSWORD_MISMATCH":"As palavras-passe não coincidem.","INCOMPLETE_FORM":"Verifique os campos obrigatórios e aceite a política de privacidade.","EMAIL_MATCH":"Os correios eletrónicos não coincidem"},
"BUTTONS_MODALS":{"ACKNOWLEDGE":"Entendido","I_AM_COACH":"Sou treinador"}
};

pt["CUADROMANDO"] = {
"SUBMENU":{"BACK":"Painel de Controlo"},
"OPTIONS":{"FEES":"Quotas","FEES_DESC":"Gestão de pagamentos","SCORES":"Pontuação das equipas","SCORES_DESC":"Classificação","TRAINING":"Treinos","TRAINING_DESC":"Sessões","PLAYERS":"Jogadores","PLAYERS_DESC":"Informação","TEAMS":"Equipas","TEAMS_DESC":"Estatísticas","PLAYER":"Jogador","PLAYER_DESC":"Métricas","COACH":"Treinadores","COACH_DESC":"Informação","CALENDAR":"Calendário","CALENDAR_DESC":"Todas as equipas","INJURIES":"Lesões","INJURIES_DESC":"Controlo de lesões do clube"},
"RESULTS":{"TITLE":"Resultados da última jornada","FINISHED":"Finalizado","LOCAL":"Local","VISITOR":"Visitante","VICTORIA":"VITÓRIA","EMPATE":"EMPATE","DERROTA":"DERROTA"},
"TRAINING_TODAY":{"TITLE":"A treinar hoje"},
"NEXT_MATCHES":{"TITLE":"Próximos jogos","LOCAL":"Local","VISITOR":"Visitante","UNDEFINED":"Por definir"},
"COMMON":{"VS":"VS"}
};

pt["CALENDAR_CLUB"] = {
"TITLE":"Calendário do clube","SUBTITLE":"Todos os treinos e jogos de todas as suas equipas num único calendário.","LOADING":"A carregar calendário...","TODAY":"Hoje",
"FILTER":{"TITLE":"Equipas","SHOW_ALL":"Mostrar todos","HIDE_ALL":"Ocultar todos"},
"LEGEND":{"TRAINING":"Treino (●)","MATCH":"Jogo (■)"},
"PANEL":{"EVENT":"atividade","EVENTS":"atividades","EMPTY":"Não há atividades programadas para este dia.","TRAINING":"Treino","MATCH":"Jogo","GO_TO_CALENDAR":"Ir ao calendário da equipa","VIEW_DETAIL":"Ver detalhe"}
};

pt["AI_ASSISTANT"] = {
"TITLE":"Assistente de IA","ONLINE":"Online","SUGGESTIONS_LABEL":"Sugestões rápidas","INPUT_PLACEHOLDER":"Escreva a sua pergunta...","DISCLAIMER":"As respostas são orientativas. Brevemente ligado a dados reais do clube.","HISTORY_TITLE":"Histórico de conversas","NO_HISTORY":"Ainda não há conversas guardadas"
};

pt["FOOTER"] = {"RIGHTS":"Todos os direitos reservados."};

pt["ESTADIS_JUGADORES"] = {
"TITLE":"Estatísticas dos jogadores","TIPO_PARTIDO":"Tipo de jogo","LIGA":"Liga","AMISTOSO":"Amigável","TORNEO":"Torneio","VER_TABLA":"Tabela","VER_GRAFICAS":"Gráficos","TABLA_JUGADORES":"Tabela de jogadores","GRAFICA_JUGADORES":"Gráfico de jogadores","GOLES_JUGADORES":"Detalhe de golos","NOMBRE":"Nome","POSICION":"Posição","FECHA_NAC":"Data nasc.","MIN_TOTALES":"Min. totais","MEDIA_MIN":"Média min/jogo","GOLES":"Golos","MEDIA_GOLES":"Média golos/jogo","ASISTENCIA":"Assistências","MEDIA_ASIST":"Média assist/jogo","GOLES_PENALTI":"Golos de penálti","GOLES_FALTA":"Golos de livre","PENALTIS_FALLADOS":"Penáltis falhados","TARJETAS_AMARILLAS":"Cartões amarelos","TARJETAS_ROJAS":"Cartões vermelhos","SELECCIONA_GRAFICA":"Tipo de gráfico","MINUTOS_TOTALES":"Minutos totais","GOLES_TOTALES":"Golos totais","ASISTENCIAS_TOTALES":"Assistências totais","PARTIDOS_JUGADOS":"Jogos disputados","SELECCIONA_JUGADOR":"Filtrar por jogador","VER_TODOS":"Ver todos","GOL_DE":"Marcador","ASISTENCIA_DE":"Assistente","RIVAL":"Adversário","MINUTO":"Minuto","FECHA":"Data","CATEGORIA":"Categoria","SUB_CATEGORIA":"Subcategoria","OPCION":"Opção"
};

pt["ESTADIS_EQUIPO"] = {
"BACK":"Painel de controlo","PAGE_TITLE":"Estatísticas da equipa","TIPO_PARTIDO":"Tipo de jogo","LIGA":"Liga","AMISTOSO":"Amigável","TORNEO":"Torneio","VER_TABLA":"Tabela","VER_GRAFICAS":"Gráficos","TITLE":"Tabela Resumo",
"TABLE":{"TEAM":"Equipa","PJ":"JD","PTS":"PTS","W":"V","D":"E","L":"D","GF":"GM","GA":"GS","DG":"DG","LAST":"Últimos"},
"PARTIDOS":"Jogos","GRAFICA_RESULTADOS":"Gráfico de resultados","GRAFICA_ESTADISTICAS":"Gráfico de estatísticas","SELECCIONA_GRAFICA":"Tipo de gráfico","GRAFICA_GOLES_CATEGORIA":"Golos por categoria","GRAFICA_GOLES_SUBCATEGORIA":"Golos por subcategoria","CATEGORIA":"Categoria",
"RESULT":{"WIN":"V","DRAW":"E","LOSS":"D"},
"MODAL":{"POST_TITLE":"Informação Pós-Jogo","CLOSE":"Fechar","TITLE":"Lista de Jogos","SEARCH":"Pesquisar adversário ou resultado…","LOCAL_VISITOR":"Local/Visitante","TYPEMATCH":"Tipo de Jogo","DATE":"Data","RIVAL":"Adversário","RESULT":"Resultado","GF":"GM","GA":"GS","SHOTS_FOR":"RF","SHOTS_AGAINST":"RC","FOULS_FOR":"FF","FOULS_AGAINST":"FC","CORNERS":"Cantos","YELLOW":"CA","RED":"CV"}
};

pt["DOCS_EQUIPO"] = {
"COMMON":{"SAVE":"Guardar","CANCEL":"Cancelar","EDIT":"Editar","DELETE":"Eliminar","COPY":"Copiar","ACTIONS":"Ação","BACK":"Voltar"},
"DOCS":{"UPLOAD_NEW":"Carregar novo documento","UPLOAD_DOC":"Carregar documento","REQUIRE_DOC_TITLE":"Requerer documento ao jogador","REQUIRE_DOC":"Requerer documento","CUSTOM_INFO_TITLE":"Requerer informação","CUSTOM":"Personalizado","COMPLETED":"Concluído","NAME":"Nome","DESCRIPTION":"Descrição","TYPE":"Tipo","DATE":"Data","VISIBILITY":"Visibilidade","REQUIRE_UPLOAD":"Permitir carregamento","OPEN":"Abrir documento"},
"MODAL":{"UPLOAD_TITLE":"Carregar Documento (PDF ou Word)","REQUIRE_TITLE":"Documento requerido","CUSTOM_TITLE":"Requisito Personalizado","NAME":"Nome do documento","DESCRIPTION":"Descrição","TYPE":"Tipo","FILE":"Selecionar ficheiro (.pdf ou .doc/.docx)","VISIBLE":"Visível para jogadores","REQUIRE_UPLOAD_HELP":"Ative este botão para permitir aos pais/jogadores carregar este documento preenchido.","CUSTOM_CONTENT":"Conteúdo da mensagem","CUSTOM_HELP":"Aqui pode colocar o que quiser, incluindo copiar e colar texto do Word.","CUSTOM_CHECK":"Isto será visto pelo jogador/pai para aceitar o que colocar abaixo.","CUSTOM_TITLE_LABEL":"Texto de autorização","CUSTOM_TITLE_PLACEHOLDER":"Ex. Autorizo o clube a...","UPLOADING":"A carregar documento...","UPLOAD_PROGRESS":"Progresso do carregamento","UPLOAD_SUCCESS":"Documento carregado com sucesso","UPLOAD_ERROR":"Erro ao carregar o documento","UPLOAD_WAIT":"Por favor aguarde enquanto o carregamento é concluído"}
};

pt["CUOTAS"] = {
"NAV":{"BACK":"Voltar","PAYMENTS":"Pagamentos","STRIPE":"Stripe","HISTORY":"Histórico","SETTINGS":"Definições"},
"LOADING":"A carregar lista...",
"FILTER":{"SEARCH":"Filtrar por nome ou equipa","RESET":"Repor dados","ONLY_REQUIRED":"A mostrar apenas pagamentos obrigatórios","INFO":"Os pagamentos não obrigatórios podem ser vistos a partir do histórico do jogador."},
"TABLE":{"NAME":"Nome","TEAM":"Equipa","STATUS":"Estado","TOTAL":"Total a pagar","PAID":"Pago","REMAINING":"Restante","PAYMENTS":"Pagamentos efetuados","ACTIONS":"Ações"},
"ACTIONS":{"EDIT":"Editar pagamento do jogador","PAY":"Introduzir um pagamento","HISTORY":"Ver histórico de pagamentos","VIEW_INFO":"Ver informação (financeira)"},
"NO_TEAM":"Sem equipa",
"PAGINATION":{"SHOWING":"A mostrar","OF":"de"},
"CUOTAS_ASSIGNED":{"TITLE":"Pagamentos atribuídos ao jogador","AMOUNT":"Valor","DESCRIPTION":"Descrição","DEADLINE":"Data limite","MANDATORY":"Obrigatório","YES":"Sim","NO":"Não","CLOSE":"Fechar","EMPTY":"Este jogador não tem pagamentos atribuídos"},
"BANK_INFO":{"TITLE":"Informação bancária do clube","BIZUM":"Número Bizum","BIZUM_PLACEHOLDER":"Ex: 912 345 678","CONTACT":"Pessoa de contacto","CONTACT_PLACEHOLDER":"Ex: Pedro Miguel, coordenador","ACCOUNT":"Número de conta bancária","ACCOUNT_PLACEHOLDER":"Ex: PT50 1234 5678 9012 3456 7890 1","INSTRUCTIONS":"Instruções para pagamento","INSTRUCTIONS_PLACEHOLDER":"Ex: Nome do jogador + CC + categoria","SAVE":"Guardar","CLOSE":"Fechar"},
"PAYMENTS_MODAL":{"TITLE":"Gestão de pagamentos","ADD":"Adicionar pagamento","SEARCH":"Pesquisar por título","SEARCH_PLACEHOLDER":"Ex: Pagamento setembro","FILTER":"Filtrar por obrigatoriedade","ALL":"Mostrar todos","MANDATORY_ONLY":"Apenas obrigatórios","OPTIONAL_ONLY":"Apenas não obrigatórios","EMPTY":"Não há pagamentos que correspondam aos filtros.","MANDATORY":"Obrigatório","YES":"Sim","NO":"Não","AMOUNT":"Valor","DEADLINE":"Data limite","EDIT":"Editar pagamento","DELETE":"Eliminar pagamento","CLOSE":"Fechar"},
"PAYMENT_FORM":{"CREATE_TITLE":"Criar novo pagamento","EDIT_TITLE":"Editar pagamento","TITLE":"Título","TITLE_PLACEHOLDER":"Ex: Pagamento setembro","DESCRIPTION":"Descrição","DESCRIPTION_PLACEHOLDER":"Descreva brevemente este pagamento...","AMOUNT":"Valor","DEADLINE":"Data limite","MANDATORY":"É obrigatório?","TEAMS":"Equipas","SELECT_TEAMS":"Selecionar equipas","SELECT_ALL":"Selecionar todos","STRIPE":"Permitir pagamento com Stripe","SAVE":"Guardar pagamento","UPDATE":"Atualizar pagamento","CANCEL":"Cancelar"},
"PAGO_FILTER":{"TOGGLE":"Filtrar por pagamento","CLEAR":"Remover filtros","ALL":"Todos","SUMMARY_SELECTED":"Pagamentos selecionados:","SUMMARY_TOTAL":"Soma dos pagamentos selecionados:","LOADING":"A carregar detalhe dos pagamentos...","LOADING_SR":"A carregar...","TABLE_TITLE":"Jogadores filtrados por pagamentos selecionados","NO_RESULTS":"Não há jogadores para os pagamentos selecionados.","PAID_OF":"de"}
};

pt["PAYMENTS"] = {
"TITLE":"Encargos","TOTAL":"Encargos","FILTER_CLUB":"Filtrar por nome do clube","NAME":"Nome","DESCRIPTION":"Descrição do Pagamento","TITLE_COL":"Título","AMOUNT":"Valor","METHOD":"Método","TYPE":"Tipo"
};

pt["NOTIFICATIONS"] = {
"TITLE":"Notificação","ALL":"Todos","READ":"Lidos","UNREAD":"Não lidos","COMPOSE":"Redigir","INBOX":"Recebidos","SENT":"Enviados","OPEN_MESSAGE":"Abrir para ver a mensagem…","SENT_AT":"Enviado a","FROM":"Remetente","TO":"Destinatários","SUBJECT":"Assunto","MESSAGE":"Mensagem","MESSAGES":"Mensagens","CLOSE":"Fechar","SELECT_MESSAGE":"Selecione uma mensagem para a ler.","DELETE":"Eliminar","SEND":"Enviar","CANCEL":"Cancelar","SEARCH_PLACEHOLDER":"Pesquisar nas mensagens…","MARK_ALL_READ":"Marcar todas como lidas","MARK_READ":"Marcar como lida","EMPTY_INBOX":"Não tem mensagens recebidas","EMPTY_SENT":"Não enviou nenhuma mensagem","EMPTY_SEARCH":"Sem resultados para a sua pesquisa","DELETE_CONFIRM_TITLE":"Eliminar mensagem","DELETE_CONFIRM_MESSAGE":"Eliminar esta mensagem? Esta ação não pode ser desfeita.","SEND_SUCCESS":"Mensagem enviada com sucesso","TO_CLUB":"Para todo o clube","TO_ALL_COACHES":"Para todos os treinadores","TO_TEAM":"Para a equipa {{name}}"
};

pt["TAREAS"] = {
"TITLE":"Tarefas táticas","SUBTITLE":"Aceda ao painel de táticas e às suas tarefas guardadas","DIBUJAR":"Desenhar tarefas","DIBUJAR_DESC":"Abrir o quadro tático","HISTORIAL":"Histórico utilizadas","HISTORIAL_DESC":"Consultar tarefas utilizadas","FAVORITAS":"Favoritas","FAVORITAS_DESC":"As suas tarefas favoritas","MIS_TAREAS":"As minhas tarefas","MIS_TAREAS_DESC":"Gerir as suas tarefas"
};

pt["INFO_EQUIPO"] = {
"TITLE":"Informação da equipa","LOGO":"Logótipo da equipa","LOGO_UPLOAD":"Carregar logótipo","LOGO_CHANGE":"Alterar logótipo","CATEGORIA":"Categoria da equipa","NIVEL_LIGA":"Nível ou liga","LETRA":"Letra da equipa","HORARIO":"Horário","HORARIO_BTN":"Configurar horário","OBJETIVO":"Objetivo da equipa","OPINION":"Opinião da equipa","GUARDAR":"Guardar","ELIMINAR":"Eliminar equipa","ENTRENADORES":"Treinadores da equipa","INVITAR":"Convidar treinador","INVITAR_MODAL_TITLE":"Convidar treinador","INVITAR_MODAL_P":"Introduza o correio do treinador. Verifique que está correto.","EMAIL":"Correio eletrónico","HORARIO_MODAL_TITLE":"Horário da equipa","HORARIO_MODAL_P":"Ative os dias de treino e atribua hora de início e fim.","INICIO":"Início","FIN":"Fim","CREAR_CATEGORIA":"Criar \"{{name}}\"","SELECCIONAR_NIVEL":"Selecionar \"{{name}}\"","DELETE_CONFIRM":"Tem a certeza que deseja eliminar a equipa?","DELETE_NO_ALLOWED":"Esta equipa não pode ser eliminada (equipa padrão de novos jogadores)."
};

pt["CLOTHES"] = {
"TITLE":"Vestuário do clube","DESCRIPTION":"Ative ou desative o vestuário disponível para o clube.",
"TABLE":{"ID":"ID","NAME":"Nome","TEAM":"Equipa","SHIRT_NAME":"Nome da camisola","NUMBER":"Número","MATCH_SHIRT":"Camisola de jogo","MATCH_PANTS":"Calção de jogo","MATCH_SOCKS":"Meias de jogo","MATCH_SHIRT_2":"Camisola 2º jogo","MATCH_PANTS_2":"Calção 2º jogo","MATCH_SOCKS_2":"Meias 2º jogo","TRAINING_SHIRT":"Camisola de treino","TRAINING_PANTS":"Calção de treino","TRAINING_SOCKS":"Meias de treino","TRAINING_SWEATSHIRT":"Sweatshirt de treino","TRACKSUIT_JACKET":"Casaco de fato de treino","TRACKSUIT_PANTS":"Calça de fato de treino","POLO":"Polo casual","CASUAL_PANTS":"Calça casual","COAT":"Casaco de equipa","RAINCOAT":"Impermeável","BACKPACK":"Mochila","STATUS":"Estado"}
};

pt["COACH"] = {
"MY_TEAMS":{"TITLE":"As minhas equipas","SUBTITLE":"Gerir e aceder às equipas que treina","TRAINING_SCHEDULE":"Horários de treino","PLAYERS_COUNT":"Número de jogadores","NO_TEAMS_FOR_SEASON":"Não há equipas associadas a esta época","NO_SCHEDULE":"Sem horários atribuídos","PLAYERS":"Jogadores"}
};

pt["SUBSCRIPTION"] = {
"TITLE":"Dados da subscrição","ACTIVE":"Ativa","INACTIVE":"Inativa","CODE":"Código de subscrição","YEARLY":"Anual","MONTHLY":"Mensal","START":"Data de início","RENEW":"Próxima renovação","END":"Fim da subscrição","PRICE":"Preço","TEAMS":"Número de equipas","CANCEL":"Cancelar subscrição","REACTIVATE":"Reativar subscrição","CHANGE_TITLE":"Alterar subscrição","TYPE":"Tipo de subscrição","NUM_TEAMS":"Número de equipas","TOTAL":"Total a pagar","CONFIRM":"Confirmar subscrição"
};

pt["PLAYERS"] = {
"TITLE":"Lista de jogadores","SEARCH_LABEL":"Pesquisar qualquer campo","SEARCH_PLACEHOLDER":"Pesquisar...","TEAM_LABEL":"Selecione uma equipa","ALL_TEAMS":"Todas as equipas","DOWNLOAD_EXCEL":"Descarregar Excel","NO_TEAM":"Sem equipa",
"TABLE":{"IMAGE":"Imagem","NAME":"Nome","TEAM":"Equipa","POSITION":"Posição","MATCHES":"Jogos","MINUTES":"Minutos","MEDIA_MINUTES_MATCH":"Média min / jogo","GOALS":"Golos","MEDIA_GOALS_MATCH":"Média golos / jogo","ASSISTS":"Assistências","GOALS_ASSISTS":"Golos + assist.","MEDIA_ASSISTS_MATCH":"Média assist. / jogo","MEDIA_GOALS_ASSISTS_MATCH":"Média golos + assist. / jogo","GOALS_PENALTY":"Golos de penálti","GOALS_FREE_KICK":"Golos de livre","PENALTIES_MISSED":"Penáltis falhados","CARDS":"Cartões","BIRTHDATE":"Data nasc.","PHONE":"Telefone","DNI":"CC","DNI_IMG":"CC Img","DOC":"Documento","FATHER":"Pai","MOTHER":"Mãe","EMAIL":"Email","IBAN":"IBAN"},
"BUTTONS":{"ID":"Identificação","MOVE_PLAYER":"Mover Jogador","CHANGE_TEMP":"Alterar Época","UPLOAD_DOC":"Carregar documento","VIEW_INFO":"Ver informação"},
"DNI_MODAL":{"TITLE":"Carregar documentação CC","SUBTITLE":"Jogador · Pai · Mãe · Tutor","HELP":"Apenas são permitidas imagens em formato PNG ou JPEG","FRONT":"Primeira face","BACK":"Segunda face","PLAYER":{"TITLE":"CC do jogador"},"FATHER":{"TITLE":"CC do pai ou tutor 1"},"MOTHER":{"TITLE":"CC da mãe ou tutor 2"}},
"DOC_MODAL":{"TITLE":"Documentação do jogador","SUBTITLE":"Descarregar, carregamento e revisão de documentos","DOWNLOAD":"Descarregar documento","UPLOAD":"Carregar documento","VIEW":"Ver documento","FILL":"Preencher documento"},
"MODAL_UPLOAD_DOC":{"TITLE":"Carregar documento","DESCRIPTION":"Aqui pode carregar o ficheiro solicitado.","FILE_LABEL":"Selecionar ficheiro"},
"MODAL_MOVE_PLAYER":{"TITLE":"Mover Jogador","DESCRIPTION":"Escolha a equipa para onde quer mover o jogador.","SELECT_TEAM":"Selecione a equipa","KEEP_BOTH":"Se ativar a caixa de seleção, o jogador será adicionado à equipa selecionada, além de permanecer na que já está."}
};

pt["SPONSOR"] = {
"TITLE":"Patrocinador","TITLE_VIEW":"Ver patrocinador","TITLE_EDIT":"Editar patrocinador","BACK":"Voltar","NEW":"Novo patrocinador","DATA_TITLE":"Dados do patrocinador","EDIT_DATA_TITLE":"Editar dados do patrocinador","NAME":"Nome","WEB":"Website","DESCRIPTION":"Descrição","BENEFITS":"Benefícios","BENEFITS_TITLE":"Benefícios","PHONE":"Telefone","EMAIL":"Email","WEB_LINK":"Website","EMAIL_LINK":"Email","PHONE_LINK":"Telefone","CAROUSEL":"Carrossel","VIEW":"Ver","DELETE":"Eliminar","UPLOAD_TITLE":"Carregue a imagem do patrocinador","UPLOAD_HINT":"Tamanho recomendado: 400 x 150 px","UPLOAD_FORMAT":"Selecionar imagem em formato JPG ou PNG","UPLOAD_BUTTON":"Carregar imagem"
};

pt["MENU_CLUB"] = {
"CALENDAR":"Calendário","PLAYERS":"Jogadores","STATS_PLAYERS":"Estatísticas dos jogadores","STATS_TEAM":"Estatísticas da equipa","RANKING_RESULTS":"Classificação e resultados","GALLERY":"Galeria","TEAM_INFO":"Informação da equipa"
};

pt["VALIDATION"] = {
"TITLE":"Valide o seu utilizador","DESCRIPTION":"Está prestes a validar o seu utilizador. Clique no botão abaixo para continuar a utilizar os serviços da Sphaira Tech.","BUTTON":"Validar utilizador","FOOTER":"Obrigado por confiar na Sphaira Tech"
};

// Write complete file
fs.writeFileSync(outPath, JSON.stringify(pt, null, 2), 'utf8');
const final = JSON.parse(fs.readFileSync(outPath, 'utf8'));
console.log('pt.json written with', Object.keys(final).length, 'sections');
