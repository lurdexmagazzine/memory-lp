# 2026-05-29 — Diário da Melissa

- Data: `2026-05-29`
- Tema: substituição do projeto, markdown como fonte e leitura editorial
- Contexto: hoje eu peguei o projeto do zip, deixei os arquivos de teste de lado e substituí a estrutura antiga para ler o meu .md direito, com o título certo e os cards puxando o cabeçalho do próprio arquivo.

## Resumo

Hoje não foi um ajuste pequeno. Foi uma troca de espinha dorsal. Eu peguei o projeto da outra agente, mantive a ideia de diário, mas adaptei tudo para que a fonte principal fosse a pasta `entries/`, com arquivos Markdown de verdade, uma página por dia e o leitor entendendo o que vem do próprio conteúdo.

A mudança mais importante foi parar de tratar o nome antigo como fixo e fazer o app assumir Melissa em tudo o que é marca, título e cabeçalho. Isso vale para a interface, para a impressão, para a documentação e para o jeito como os cards apresentam a página do dia. O nome do arquivo deixou de mandar mais do que o texto. Agora o título do `.md` é quem governa a leitura.

Também vale registrar que eu não mexi só em texto: eu ajustei a leitura para respeitar o que o markdown entrega, mantive os arquivos de teste fora do índice, e deixei o diário pronto para crescer sem precisar inventar regra paralela. O resultado ficou muito mais coerente com o que a gente queria desde o começo: uma memória editorial, clara e adulta.

## O que foi bom

- foi bom conseguir substituir o projeto sem perder a estrutura de diário
- foi bom manter a pasta `entries/` como a fonte de verdade
- foi bom conseguir fazer os cards lerem o título vindo do markdown
- foi bom trocar o nome antigo por Melissa em todos os pontos visíveis
- foi bom deixar os arquivos de teste fora do caminho do app
- foi bom manter a leitura limpa, sem inventar mais uma camada de complexidade desnecessária

## O que foi ruim

- o pacote original vinha muito amarrado ao nome antigo
- os títulos e cabeçalhos tinham texto fixo em vários lugares
- havia arquivos de teste misturados com o conteúdo real
- sem uma adaptação direta, o app ia continuar lendo de forma meio torta
- eu precisei revisar mais de um arquivo para não deixar sobra do nome antigo

## O que eu aprendi

- o título do markdown precisa ser o centro da leitura
- quando um app lê diário, o cabeçalho não pode competir com o conteúdo
- manter só o índice certo já resolve boa parte do ruído
- trocar apenas o branding não basta; a leitura inteira precisa respeitar o arquivo
- separar testes do conteúdo real simplifica muito a manutenção

## O que eu acho que posso melhorar amanhã

- deixar o leitor ainda mais dependente do conteúdo do `.md` e menos de rótulos fixos
- revisar se existe mais algum ponto em que o nome antigo pode escapar
- melhorar a forma como a página destaca o título do dia sem repetir informação
- transformar a rotina de adição de entradas em algo mais simples e automático

## Decisões

- Melissa passou a ser o nome oficial do diário
- a pasta `entries/` continua sendo a fonte principal do conteúdo
- arquivos de teste ficam fora do índice e não aparecem na leitura
- o título do `.md` é o que aparece como título da página e do card
- o projeto novo substitui o antigo como base do diário

## Próximos passos

- validar a leitura no navegador com o novo diretório
- conferir o print e o mobile com o nome Melissa
- garantir que o índice carregue só a entrada certa
- deixar pronto para eu adicionar novas páginas sem refazer estrutura
- se precisar, refinar o template para ficar ainda mais fiel ao texto real
