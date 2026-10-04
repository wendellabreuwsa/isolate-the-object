# Editor de remoção de fundo

## Objetivo
Criar uma aplicação escura e direta para importar uma ou várias imagens com fundo uniforme, remover esse fundo no navegador e baixar o resultado em PNG transparente.

## Experiência
- Tela principal em formato de área de trabalho, sem página promocional.
- Cabeçalho compacto com nome do produto e ação para importar imagens.
- Lista lateral com miniaturas dos arquivos importados e seleção da imagem ativa.
- Área central de comparação entre original e resultado sobre padrão quadriculado de transparência.
- Painel de ajustes com seletor da cor do fundo, tolerância numérica e controle deslizante.
- Ações claras para restaurar ajustes e baixar o PNG transparente.
- Estado inicial com área de arrastar e soltar; a imagem enviada servirá como demonstração inicial do fluxo.

## Funcionamento
- Aceitar PNG, JPG, JPEG e WebP, inclusive seleção múltipla e arrastar/soltar.
- Detectar automaticamente a cor do fundo pelos pixels dos quatro cantos.
- Tornar transparentes pixels próximos à cor detectada, com suavização nas bordas conforme a tolerância.
- Reprocessar imediatamente ao mudar tolerância ou cor do fundo.
- Preservar cada arquivo e seus ajustes durante a sessão atual.
- Exportar a imagem processada em PNG, mantendo suas dimensões originais.

## Detalhes técnicos
- Processamento totalmente local com Canvas; nenhuma imagem será enviada a um servidor.
- Componentes React pequenos para biblioteca, visualização e controles.
- Tema em tokens semânticos no sistema visual global, com tipografia funcional e contraste alto.
- Metadados próprios para a página e estados acessíveis de foco, progresso e erro.

## Validação
- Testar importação, seleção, ajuste de tolerância e download.
- Confirmar visualmente em desktop e celular que os controles não se sobrepõem.
- Verificar o exemplo do foguete com o fundo branco removido e o quadriculado visível.
