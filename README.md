# AliExpress Photo Downloader (Extensão Chrome)

Extensão em **Manifest V3** para baixar imagens de produtos do AliExpress.

## Como instalar (modo desenvolvedor)

1. Abra `chrome://extensions` no Google Chrome.
2. Ative **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação**.
4. Selecione a pasta deste projeto.

## Como usar

1. Entre em uma página de produto do AliExpress.
2. Passe o mouse em cima da foto do produto (funciona para `<img>` e também alguns blocos com imagem de fundo).
3. O botão **Baixar foto** vai aparecer próximo ao cursor.
4. Clique no botão e escolha onde salvar o arquivo.

## Solução de problemas

- Se o botão não aparecer, recarregue a página após instalar a extensão.
- Confirme se a extensão está ativada em `chrome://extensions`.
- Alguns layouts do AliExpress mudam com frequência; se uma página específica falhar, teste em outra página de produto.

## Observações

- Alguns arquivos podem ter limitações de acesso (CORS/anti-bot) impostas pelo site.
- Use apenas para conteúdo que você tem direito de baixar e reutilizar.
