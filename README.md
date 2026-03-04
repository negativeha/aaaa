# AliExpress Photo Downloader (Extensão Chrome)

Extensão em **Manifest V3** para baixar imagens de produtos do AliExpress.

## Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions` no Google Chrome.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta deste projeto.

## Como usar

### Opção 1: botão flutuante na página

1. Entre em uma página de produto do AliExpress.
2. Passe o mouse em cima da foto do produto (a extensão prioriza imagens reais do anúncio e ignora backgrounds/ícones como carrinho).
3. O botão **Baixar foto** vai aparecer próximo ao cursor.
4. Clique no botão e escolha onde salvar o arquivo.

### Opção 2: popup da extensão (novo)

1. Na página do produto, clique no ícone da extensão na barra do Chrome.
2. Clique em **Baixar foto principal**.
3. A extensão procura a foto principal do anúncio (com heurística focada na galeria do produto) e inicia o download.

## Solução de problemas

- Se o botão não aparecer, use a opção pelo **popup da extensão** (agora ele tenta preparar a aba automaticamente).
- Recarregue a página após instalar/atualizar a extensão.
- Confirme se a extensão está ativada em `chrome://extensions`.
- Alguns layouts do AliExpress mudam com frequência; se uma página específica falhar, teste em outra página de produto.

## Observações

- Alguns arquivos podem ter limitações de acesso (CORS/anti-bot) impostas pelo site.
- Use apenas para conteúdo que você tem direito de baixar e reutilizar.
