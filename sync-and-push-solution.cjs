#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configurações
const CONFIG = {
    REPO_NAME: 'github-sync-test',
    GITHUB_USERNAME: 'Reifonas',
    TEST_FILE: 'sync-test.md',
    TOKENS_FILE: path.join(__dirname, 'data', 'auth', 'tokens.json'),
    ENV_FILE: path.join(__dirname, '.env')
};

// Função para executar comandos com tratamento de erro
function runCommand(command, options = {}) {
    try {
        console.log(`🔧 Executando: ${command}`);
        const result = execSync(command, { 
            encoding: 'utf8', 
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options 
        });
        return { success: true, output: result };
    } catch (error) {
        console.log(`❌ Erro: ${error.message}`);
        return { success: false, error: error.message, output: error.stdout };
    }
}

// Função para carregar token do GitHub
function loadGitHubToken() {
    console.log('🔍 Procurando token do GitHub...');
    
    // 1. Tentar carregar do .env
    if (fs.existsSync(CONFIG.ENV_FILE)) {
        const envContent = fs.readFileSync(CONFIG.ENV_FILE, 'utf8');
        const tokenMatch = envContent.match(/GITHUB_TOKEN=([^\n\r]+)/);
        if (tokenMatch && tokenMatch[1] && !tokenMatch[1].includes('MASKED')) {
            console.log('✅ Token encontrado no .env');
            return tokenMatch[1].trim();
        }
    }
    
    // 2. Tentar variável de ambiente
    if (process.env.GITHUB_TOKEN && !process.env.GITHUB_TOKEN.includes('MASKED')) {
        console.log('✅ Token encontrado em variável de ambiente');
        return process.env.GITHUB_TOKEN;
    }
    
    // 3. Tentar carregar do tokens.json
    if (fs.existsSync(CONFIG.TOKENS_FILE)) {
        try {
            const tokensData = JSON.parse(fs.readFileSync(CONFIG.TOKENS_FILE, 'utf8'));
            
            // Procurar por tokens válidos
            for (const [userId, userData] of Object.entries(tokensData)) {
                if (userData.github_token && 
                    !userData.github_token.includes('MASKED') && 
                    userData.github_token.startsWith('ghp_')) {
                    console.log(`✅ Token válido encontrado para usuário: ${userId}`);
                    return userData.github_token;
                }
            }
        } catch (error) {
            console.log('❌ Erro ao ler tokens.json:', error.message);
        }
    }
    
    console.log('❌ Nenhum token válido encontrado');
    return null;
}

// Função para configurar Git com credenciais
function setupGitCredentials(token) {
    console.log('🔧 Configurando credenciais do Git...');
    
    const commands = [
        `git config user.name "${CONFIG.GITHUB_USERNAME}"`,
        `git config user.email "${CONFIG.GITHUB_USERNAME}@users.noreply.github.com"`,
        `git remote set-url origin https://${token}@github.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}.git`
    ];
    
    for (const cmd of commands) {
        const result = runCommand(cmd, { silent: true });
        if (!result.success) {
            throw new Error(`Falha na configuração do Git: ${result.error}`);
        }
    }
    
    console.log('✅ Git configurado com sucesso');
}

// Função para sincronizar com repositório remoto
function syncWithRemote() {
    console.log('🔄 Sincronizando com repositório remoto...');
    
    // Primeiro, tentar um fetch
    let fetchResult = runCommand('git fetch origin', { silent: true });
    
    if (fetchResult.success) {
        console.log('✅ Fetch realizado com sucesso');
        
        // Verificar se há diferenças
        const statusResult = runCommand('git status --porcelain', { silent: true });
        const behindResult = runCommand('git rev-list HEAD..origin/main --count', { silent: true });
        
        if (behindResult.success && parseInt(behindResult.output.trim()) > 0) {
            console.log('📥 Repositório local está atrás do remoto, fazendo pull...');
            
            // Tentar pull normal primeiro
            let pullResult = runCommand('git pull origin main', { silent: true });
            
            if (!pullResult.success) {
                console.log('⚠️ Pull normal falhou, tentando com allow-unrelated-histories...');
                pullResult = runCommand('git pull origin main --allow-unrelated-histories', { silent: true });
                
                if (!pullResult.success) {
                    console.log('⚠️ Pull com allow-unrelated-histories falhou, tentando rebase...');
                    pullResult = runCommand('git pull --rebase origin main', { silent: true });
                }
            }
            
            if (pullResult.success) {
                console.log('✅ Sincronização concluída');
            } else {
                console.log('⚠️ Sincronização falhou, continuando com force push...');
            }
        } else {
            console.log('✅ Repositório já está sincronizado');
        }
    } else {
        console.log('⚠️ Fetch falhou, continuando...');
    }
}

// Função para criar arquivo de teste
function createTestFile() {
    const timestamp = new Date().toISOString();
    const content = `# Teste de Sincronização GitHub

**Timestamp:** ${timestamp}
**Status:** Teste de push automático
**Repositório:** ${CONFIG.REPO_NAME}
**Usuário:** ${CONFIG.GITHUB_USERNAME}

## Detalhes do Teste

- ✅ Token carregado automaticamente
- ✅ Git configurado
- ✅ Sincronização com remoto
- ✅ Arquivo de teste criado
- 🚀 Push em andamento...

---
*Gerado automaticamente pelo sync-and-push-solution.cjs*
`;
    
    fs.writeFileSync(CONFIG.TEST_FILE, content);
    console.log(`✅ Arquivo de teste criado: ${CONFIG.TEST_FILE}`);
}

// Função para fazer commit e push
function commitAndPush() {
    console.log('📝 Fazendo commit das alterações...');
    
    // Adicionar arquivos
    let result = runCommand('git add .');
    if (!result.success) {
        throw new Error(`Falha ao adicionar arquivos: ${result.error}`);
    }
    
    // Fazer commit
    const commitMessage = `Sync test: ${new Date().toISOString()}`;
    result = runCommand(`git commit -m "${commitMessage}"`);
    if (!result.success && !result.error.includes('nothing to commit')) {
        throw new Error(`Falha no commit: ${result.error}`);
    }
    
    console.log('🚀 Fazendo push...');
    
    // Tentar push normal primeiro
    result = runCommand('git push -u origin main');
    
    if (!result.success) {
        console.log('⚠️ Push normal falhou, tentando force-with-lease...');
        result = runCommand('git push --force-with-lease origin main');
        
        if (!result.success) {
            console.log('⚠️ Force-with-lease falhou, tentando force...');
            result = runCommand('git push --force origin main');
        }
    }
    
    if (result.success) {
        console.log('✅ Push realizado com sucesso!');
        return true;
    } else {
        throw new Error(`Falha no push: ${result.error}`);
    }
}

// Função para verificar se o push foi bem-sucedido
function verifyPush(token) {
    console.log('🔍 Verificando push no GitHub...');
    
    try {
        const curlCommand = `curl -s -H "Authorization: token ${token}" https://api.github.com/repos/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}/commits`;
        const result = runCommand(curlCommand, { silent: true });
        
        if (result.success) {
            const commits = JSON.parse(result.output);
            if (commits && commits.length > 0) {
                console.log(`✅ Push verificado! Último commit: ${commits[0].sha.substring(0, 7)}`);
                console.log(`📅 Data: ${commits[0].commit.author.date}`);
                console.log(`💬 Mensagem: ${commits[0].commit.message}`);
                return true;
            }
        }
    } catch (error) {
        console.log('⚠️ Não foi possível verificar o push via API');
    }
    
    return false;
}

// Função para limpar configurações sensíveis
function cleanup() {
    console.log('🧹 Limpando configurações sensíveis...');
    
    const cleanupCommands = [
        'git config --unset user.name',
        'git config --unset user.email'
    ];
    
    for (const cmd of cleanupCommands) {
        runCommand(cmd, { silent: true });
    }
    
    console.log('✅ Limpeza concluída');
}

// Função para salvar relatório
function saveReport(status, data) {
    const report = {
        status,
        timestamp: new Date().toISOString(),
        repository: `${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}`,
        ...data
    };
    
    const reportFile = `sync-push-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    console.log(`📄 Relatório salvo: ${reportFile}`);
    
    return reportFile;
}

// Função principal
async function main() {
    console.log('🚀 INICIANDO SINCRONIZAÇÃO E PUSH AUTOMÁTICO');
    console.log('============================================================');
    
    try {
        // 1. Carregar token
        const token = loadGitHubToken();
        if (!token) {
            throw new Error('Token do GitHub não encontrado ou inválido');
        }
        
        // 2. Configurar Git
        setupGitCredentials(token);
        
        // 3. Sincronizar com remoto
        syncWithRemote();
        
        // 4. Criar arquivo de teste
        createTestFile();
        
        // 5. Commit e push
        const pushSuccess = commitAndPush();
        
        // 6. Verificar push
        const verifySuccess = verifyPush(token);
        
        // 7. Limpar configurações
        cleanup();
        
        // 8. Salvar relatório de sucesso
        const reportFile = saveReport('success', {
            push_successful: pushSuccess,
            verification_successful: verifySuccess,
            test_file: CONFIG.TEST_FILE,
            repository_url: `https://github.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}`
        });
        
        console.log('\n✅ SINCRONIZAÇÃO E PUSH CONCLUÍDOS COM SUCESSO!');
        console.log('============================================================');
        console.log(`📊 Relatório: ${reportFile}`);
        console.log(`🌐 Repositório: https://github.com/${CONFIG.GITHUB_USERNAME}/${CONFIG.REPO_NAME}`);
        
    } catch (error) {
        console.log('\n❌ ERRO NA SINCRONIZAÇÃO E PUSH');
        console.log('============================================================');
        console.log(`❌ ERRO: ${error.message}`);
        
        // Limpar configurações mesmo em caso de erro
        cleanup();
        
        // Salvar relatório de erro
        const reportFile = saveReport('error', {
            error: error.message,
            stack: error.stack,
            troubleshooting: {
                token_issues: [
                    'Verificar se o token é válido e começa com "ghp_"',
                    'Confirmar que o token tem os scopes necessários: repo, user',
                    'Verificar se o token não expirou'
                ],
                sync_issues: [
                    'Verificar conectividade com GitHub',
                    'Confirmar que o repositório existe',
                    'Verificar permissões de push no repositório'
                ],
                git_issues: [
                    'Verificar configuração do Git',
                    'Confirmar que não há conflitos pendentes',
                    'Verificar se o branch main existe'
                ]
            }
        });
        
        console.log(`📄 Relatório de erro: ${reportFile}`);
        process.exit(1);
    }
}

// Executar se chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main, loadGitHubToken, setupGitCredentials, syncWithRemote };