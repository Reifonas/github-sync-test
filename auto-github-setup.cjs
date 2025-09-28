const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

console.log('🔧 CONFIGURAÇÃO AUTOMÁTICA DO GITHUB');
console.log('============================================================');

// Função para fazer requisições HTTPS
function makeGitHubRequest(options, data = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseData = '';
            
            res.on('data', (chunk) => {
                responseData += chunk;
            });
            
            res.on('end', () => {
                try {
                    const parsed = responseData ? JSON.parse(responseData) : {};
                    resolve({ statusCode: res.statusCode, data: parsed, headers: res.headers });
                } catch (error) {
                    resolve({ statusCode: res.statusCode, data: responseData, headers: res.headers });
                }
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (data) {
            req.write(JSON.stringify(data));
        }
        
        req.end();
    });
}

// Função para validar token
async function validateToken(token) {
    const options = {
        hostname: 'api.github.com',
        path: '/user',
        method: 'GET',
        headers: {
            'Authorization': `token ${token}`,
            'User-Agent': 'GitHub-Sync-App',
            'Accept': 'application/vnd.github.v3+json'
        }
    };
    
    return await makeGitHubRequest(options);
}

async function setupGitHubAutomatically() {
    try {
        console.log('\n📋 INSTRUÇÕES PARA CONFIGURAÇÃO:');
        console.log('============================================================');
        console.log('\n1. 🌐 Acesse: https://github.com/settings/tokens');
        console.log('2. 🔘 Clique em "Generate new token" > "Generate new token (classic)"');
        console.log('3. 📝 Dê um nome: "GitHub Sync App"');
        console.log('4. ✅ Selecione os scopes:');
        console.log('   - ✓ repo (Full control of private repositories)');
        console.log('   - ✓ user (Update ALL user data)');
        console.log('   - ✓ admin:repo_hook (Full control of repository hooks)');
        console.log('5. 🎯 Clique em "Generate token"');
        console.log('6. 📋 Copie o token (começa com "ghp_")');
        
        console.log('\n💾 COMO CONFIGURAR O TOKEN:');
        console.log('============================================================');
        console.log('\nOpção 1 - Via arquivo .env:');
        console.log('1. Crie um arquivo ".env" na raiz do projeto');
        console.log('2. Adicione: GITHUB_TOKEN=seu_token_aqui');
        console.log('3. Execute: node auto-github-setup.cjs');
        
        console.log('\nOpção 2 - Via variável de ambiente:');
        console.log('1. No PowerShell: $env:GITHUB_TOKEN="seu_token_aqui"');
        console.log('2. Execute: node auto-github-setup.cjs');
        
        console.log('\nOpção 3 - Editar arquivo de tokens diretamente:');
        console.log('1. Abra: data/auth/tokens.json');
        console.log('2. Substitua "MASKED_FOR_SECURITY" pelo seu token real');
        console.log('3. Execute: node auto-github-setup.cjs');
        
        // Tentar carregar token de diferentes fontes
        let token = null;
        let tokenSource = '';
        
        // 1. Tentar carregar do .env
        const envPath = path.join(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/GITHUB_TOKEN=(.+)/);
            if (match && match[1] && match[1] !== 'seu_token_aqui') {
                token = match[1].trim();
                tokenSource = 'arquivo .env';
            }
        }
        
        // 2. Tentar carregar da variável de ambiente
        if (!token && process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN !== 'seu_token_aqui') {
            token = process.env.GITHUB_TOKEN;
            tokenSource = 'variável de ambiente';
        }
        
        // 3. Tentar carregar do arquivo de tokens
        if (!token) {
            const tokensPath = path.join(__dirname, 'data', 'auth', 'tokens.json');
            if (fs.existsSync(tokensPath)) {
                const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
                const userId = 'd2929b81-cb3f-47a1-b47b-6b0311964361';
                
                if (tokens[userId]?.github_token && 
                    tokens[userId].github_token !== 'MASKED_FOR_SECURITY' &&
                    tokens[userId].github_token.startsWith('ghp_')) {
                    token = tokens[userId].github_token;
                    tokenSource = 'arquivo de tokens';
                }
            }
        }
        
        if (!token) {
            console.log('\n❌ NENHUM TOKEN ENCONTRADO');
            console.log('============================================================');
            console.log('\nPor favor, configure um token usando uma das opções acima.');
            console.log('\n🔍 Locais verificados:');
            console.log('- ❌ Arquivo .env');
            console.log('- ❌ Variável de ambiente GITHUB_TOKEN');
            console.log('- ❌ Arquivo data/auth/tokens.json');
            
            // Criar arquivo .env de exemplo
            const envExample = `# Configuração do GitHub Token\n# Substitua 'seu_token_aqui' pelo seu token real do GitHub\nGITHUB_TOKEN=seu_token_aqui\n`;
            fs.writeFileSync('.env.example', envExample);
            console.log('\n📄 Arquivo .env.example criado como referência.');
            
            process.exit(1);
        }
        
        console.log(`\n✅ TOKEN ENCONTRADO (${tokenSource})`);
        console.log('============================================================');
        
        // Validar token
        console.log('🔍 Validando token...');
        const validation = await validateToken(token);
        
        if (validation.statusCode !== 200) {
            throw new Error(`Token inválido: ${validation.statusCode} - ${JSON.stringify(validation.data)}`);
        }
        
        const user = validation.data;
        console.log(`✅ Token válido para usuário: ${user.login}`);
        console.log(`👤 Nome: ${user.name || 'N/A'}`);
        console.log(`📊 Repositórios públicos: ${user.public_repos}`);
        
        // Verificar permissões
        const scopes = validation.headers['x-oauth-scopes'] || '';
        console.log(`🔐 Scopes: ${scopes}`);
        
        if (!scopes.includes('repo')) {
            console.log('⚠️ Aviso: Token pode não ter permissões suficientes para push');
            console.log('   Certifique-se de que o scope "repo" está selecionado.');
        } else {
            console.log('✅ Token tem permissões adequadas para repositórios');
        }
        
        // Atualizar arquivo de tokens
        console.log('\n💾 Atualizando configuração...');
        const tokensPath = path.join(__dirname, 'data', 'auth', 'tokens.json');
        let tokens = {};
        
        if (fs.existsSync(tokensPath)) {
            tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
        }
        
        const userId = 'd2929b81-cb3f-47a1-b47b-6b0311964361';
        
        if (!tokens[userId]) {
            tokens[userId] = {};
        }
        
        tokens[userId].github_token = token;
        tokens[userId].user_metadata = {
            github_username: user.login,
            avatar_url: user.avatar_url,
            name: user.name
        };
        tokens[userId].updated_at = new Date().toISOString();
        
        // Salvar tokens
        fs.writeFileSync(tokensPath, JSON.stringify(tokens, null, 2));
        console.log('✅ Configuração atualizada');
        
        // Testar push automático
        console.log('\n🧪 TESTANDO PUSH AUTOMÁTICO');
        console.log('============================================================');
        
        const username = user.login;
        const repoName = 'github-sync-test';
        
        // Configurar Git local
        console.log('🔧 Configurando Git local...');
        
        try {
            execSync('git remote remove origin', { stdio: 'pipe' });
        } catch (e) {}
        
        execSync(`git config user.name "${user.name || user.login}"`, { stdio: 'inherit' });
        execSync(`git config user.email "${user.email || 'noreply@github.com'}"`, { stdio: 'inherit' });
        
        // Criar repositório se não existir
        console.log('📁 Verificando repositório...');
        
        const createRepoOptions = {
            hostname: 'api.github.com',
            path: '/user/repos',
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'GitHub-Sync-App',
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            }
        };
        
        const repoData = {
            name: repoName,
            description: 'Repositório de teste para sincronização automática',
            private: false,
            auto_init: true
        };
        
        try {
            const createResult = await makeGitHubRequest(createRepoOptions, repoData);
            if (createResult.statusCode === 201) {
                console.log('✅ Repositório criado com sucesso');
            } else if (createResult.statusCode === 422) {
                console.log('ℹ️ Repositório já existe, continuando...');
            } else {
                console.log(`⚠️ Status do repositório: ${createResult.statusCode}`);
            }
        } catch (repoError) {
            console.log('⚠️ Continuando com repositório existente...');
        }
        
        // Adicionar remote com token
        const remoteUrl = `https://${username}:${token}@github.com/${username}/${repoName}.git`;
        execSync(`git remote add origin ${remoteUrl}`, { stdio: 'inherit' });
        
        // Criar arquivo de teste
        const testFile = 'github-sync-test.md';
        const testContent = `# GitHub Sync Test\n\nTeste de sincronização automática realizado em: ${new Date().toISOString()}\n\n✅ Push automático configurado com sucesso!\n\n## Detalhes da Configuração\n\n- **Usuário:** ${user.login}\n- **Token Scopes:** ${scopes}\n- **Repositórios:** ${user.public_repos}\n- **Configurado em:** ${new Date().toLocaleString()}\n`;
        
        fs.writeFileSync(testFile, testContent);
        console.log('📝 Arquivo de teste criado');
        
        // Fazer commit e push
        console.log('📝 Fazendo commit...');
        execSync('git add .', { stdio: 'inherit' });
        
        try {
            execSync(`git commit -m "Test: Configuração automática de push - ${new Date().toISOString()}"`, { stdio: 'inherit' });
        } catch (e) {
            console.log('ℹ️ Nenhuma mudança para commitar');
        }
        
        console.log('🚀 Fazendo push...');
        
        try {
            // Tentar pull primeiro
            try {
                execSync('git pull origin main --allow-unrelated-histories', { stdio: 'pipe' });
                console.log('📥 Pull realizado');
            } catch (e) {
                console.log('ℹ️ Pull não necessário ou falhou, continuando...');
                try {
                    execSync('git checkout -b main', { stdio: 'pipe' });
                } catch (e2) {}
            }
            
            // Fazer push
            execSync('git push -u origin main', { stdio: 'inherit' });
            console.log('🎉 PUSH REALIZADO COM SUCESSO!');
            
            // Verificar no GitHub
            const checkOptions = {
                hostname: 'api.github.com',
                path: `/repos/${username}/${repoName}`,
                method: 'GET',
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'GitHub-Sync-App'
                }
            };
            
            const checkResult = await makeGitHubRequest(checkOptions);
            if (checkResult.statusCode === 200) {
                console.log(`✅ Repositório confirmado: ${checkResult.data.html_url}`);
                console.log(`📈 Último push: ${checkResult.data.pushed_at}`);
            }
            
        } catch (pushError) {
            console.log('❌ Erro no push:', pushError.message);
            
            // Tentar diagnóstico
            console.log('\n🔍 DIAGNÓSTICO DO ERRO:');
            if (pushError.message.includes('rejected')) {
                console.log('- O push foi rejeitado pelo GitHub');
                console.log('- Possível causa: repositório remoto tem mudanças não sincronizadas');
                console.log('- Solução: fazer pull antes do push');
            }
            if (pushError.message.includes('authentication')) {
                console.log('- Erro de autenticação');
                console.log('- Possível causa: token inválido ou sem permissões');
                console.log('- Solução: verificar token e scopes');
            }
            if (pushError.message.includes('repository not found')) {
                console.log('- Repositório não encontrado');
                console.log('- Possível causa: repositório não foi criado');
                console.log('- Solução: criar repositório manualmente');
            }
            
            throw pushError;
        }
        
        // Limpar configuração sensível
        console.log('\n🧹 Limpando configuração sensível...');
        execSync('git remote remove origin', { stdio: 'pipe' });
        execSync(`git remote add origin https://github.com/${username}/${repoName}.git`, { stdio: 'pipe' });
        
        console.log('\n🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!');
        console.log('============================================================');
        console.log('✅ Token do GitHub configurado e validado');
        console.log('✅ Push automático testado e funcionando');
        console.log('✅ Sistema pronto para sincronização automática');
        console.log('\n📋 RESUMO DA CONFIGURAÇÃO:');
        console.log(`- 👤 Usuário: ${user.login}`);
        console.log(`- 🔐 Scopes: ${scopes}`);
        console.log(`- 📁 Repositório de teste: ${username}/${repoName}`);
        console.log(`- 🕒 Configurado em: ${new Date().toLocaleString()}`);
        
        console.log('\n🚀 PRÓXIMOS PASSOS:');
        console.log('1. O sistema agora pode fazer push automático para o GitHub');
        console.log('2. As credenciais estão configuradas de forma segura');
        console.log('3. Não será necessária intervenção manual para push');
        console.log('4. Teste o sistema fazendo mudanças e executando o sync');
        
        // Salvar relatório
        const report = {
            status: 'success',
            timestamp: new Date().toISOString(),
            token_source: tokenSource,
            user: {
                login: user.login,
                name: user.name,
                public_repos: user.public_repos
            },
            token_scopes: scopes,
            test_repository: `${username}/${repoName}`,
            actions_completed: [
                'Token encontrado e validado',
                'Credenciais salvas no sistema',
                'Repositório de teste verificado/criado',
                'Git local configurado',
                'Push automático testado com sucesso',
                'Configuração sensível limpa',
                'Sistema pronto para uso'
            ],
            next_steps: [
                'Sistema configurado para push automático',
                'Credenciais seguras em data/auth/tokens.json',
                'Teste o sync fazendo mudanças no código'
            ]
        };
        
        fs.writeFileSync('github-auto-setup-success.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Relatório completo salvo em: github-auto-setup-success.json');
        
    } catch (error) {
        console.log('\n❌ ERRO NA CONFIGURAÇÃO:', error.message);
        console.log('============================================================');
        
        const errorReport = {
            status: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
            troubleshooting: {
                token_issues: [
                    'Verificar se o token é válido e começa com "ghp_"',
                    'Confirmar que o token tem os scopes necessários: repo, user',
                    'Verificar se o token não expirou'
                ],
                network_issues: [
                    'Verificar conectividade com GitHub (api.github.com)',
                    'Verificar se não há firewall bloqueando',
                    'Tentar novamente em alguns minutos'
                ],
                permission_issues: [
                    'Verificar se o usuário tem permissão no repositório',
                    'Confirmar que o repositório existe e é acessível',
                    'Verificar se o token tem permissões de push'
                ]
            },
            recommendations: [
                'Gerar um novo token se o atual estiver inválido',
                'Verificar as configurações de rede',
                'Consultar a documentação do GitHub para troubleshooting',
                'Tentar configuração manual se o problema persistir'
            ]
        };
        
        fs.writeFileSync('github-auto-setup-error.json', JSON.stringify(errorReport, null, 2));
        console.log('📄 Relatório de erro detalhado salvo em: github-auto-setup-error.json');
        
        console.log('\n🔧 SOLUÇÕES RÁPIDAS:');
        console.log('1. Verificar se o token está correto');
        console.log('2. Confirmar conectividade com GitHub');
        console.log('3. Verificar permissões do token');
        console.log('4. Tentar gerar um novo token');
        
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    setupGitHubAutomatically();
}

module.exports = { setupGitHubAutomatically };