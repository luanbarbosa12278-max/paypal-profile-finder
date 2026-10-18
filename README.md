# PayPal Profile Finder

Aplicação Node.js que tenta ler metadados disponíveis em páginas públicas PayPal.Me.

## Executar
- Requer Node.js 18 ou superior.
- Execute `npm start`.
- Abra `http://localhost:3000`.

## Publicar
Use um serviço que execute Node.js, como Render. Build command: `npm install`. Start command: `npm start`.

## Limitações
O PayPal não oferece uma API pública universal para pesquisar qualquer conta por username. Esta aplicação consulta somente `https://www.paypal.me/<username>` e depende dos metadados que a página expõe. Não garante identidade nem atividade da conta e não contorna login, CAPTCHA ou privacidade.
