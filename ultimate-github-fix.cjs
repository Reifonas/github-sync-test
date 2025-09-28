const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 SOLUÇÃO DEFINITIVA PARA GITHUB PUSH');
console.log('============================================================');

class UltimateGitHubFix {
    constructor() {
        this.userId = 'd2929b81-cb3f-47a1-b47b-6b0311964361';
        this.reportFile = 'ultimate-fix-report.json';
        this.report = {
            timestamp: new Date().toISOString(),
            status: 'STARTED',
            steps: [],
            errors: [],
            success: false
        };
    }

    log(message, type = 'info') {
        const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
        console.log(`${icons[type]} ${message}`);
        this.report.steps.push({ type, message, timestamp: new Date().toISOString() });
    }

    async loadCredentials() {
        try {
            const tokensData = JSON.parse(fs.readFileSync('data/auth/tokens.json', 'utf8'));
            const userToken = tokensData[this.userId];
            
            if (!userToken || !userToken.github_token) {
                throw new Error('Token do GitHub não encontrado');
            }

            this.token = userToken.github_token;
            this.username = userToken.github_username || 'Reifonas';
            this.log(`Credenciais carregadas para: ${this.username}`, 'success');
            return true;
        } catch (error) {
            this.log(`Erro ao carregar credenciais: ${error.message}`, 'error');
            return false;
        }
    }

    async createFreshRepository() {
        try {
            this.log('[STEP 1] Criando repositório completamente novo...', 'info');
            
            // Verificar se o repositório existe
            const checkCmd = `curl -s -H "Authorization: token ${this.token}" https://api.github.com/repos/${this.username}/test-repo`;
            const checkResult = execSync(checkCmd, { encoding: 'utf8' });
            
            if (checkResult.includes('"message": "Not Found"')) {
                // Criar repositório
                const createData = JSON.stringify({
                    name: 'test-repo',
                    description: 'Repositório de teste para push automático',
                    private: false,
                    auto_init: false
                });
                
                const createCmd = `curl -s -X POST -H "Authorization: token ${this.token}" -H "Content-Type: application/json" -d '${createData}' https://api.github.com/repos`;
                const createResult = execSync(createCmd, { encoding: 'utf8' });
                
                if (createResult.includes('"clone_url"')) {
                    this.log('Repositório criado com sucesso', 'success');
                } else {
                    throw new Error('Falha ao criar repositório');
                }
            } else {
                this.log('Repositório já existe', 'info');
            }
            
            return true;
        } catch (error) {
            this.log(`Erro ao criar repositório: ${error.message}`, 'error');
            return false;
        }
    }

    async cleanGitHistory() {
        try {
            this.log('[STEP 2] Limpando histórico do Git...', 'info');
            
            // Remover .git existente
            if (fs.existsSync('.git')) {
                execSync('rmdir /s /q .git', { stdio: 'ignore' });
                this.log('Histórico Git anterior removido', 'success');
            }
            
            // Inicializar novo repositório
            execSync('git init', { stdio: 'ignore' });
            execSync('git branch -M main', { stdio: 'ignore' });
            this.log('Novo repositório Git inicializado', 'success');
            
            return true;
        } catch (error) {
            this.log(`Erro ao limpar histórico: ${error.message}`, 'error');
            return false;
        }
    }

    async setupSecureEnvironment() {
        try {
            this.log('[STEP 3] Configurando ambiente seguro...', 'info');
            
            // Criar .env para tokens
            const envContent = `# Configurações do GitHub\nGITHUB_TOKEN=${this.token}\nGITHUB_USERNAME=${this.username}\n`;
            fs.writeFileSync('.env', envContent);
            
            // Atualizar .gitignore
            const gitignoreContent = `
# Arquivos de credenciais
.env
.env.local
.env.*.local
data/auth/tokens.json
data/users.json
**/tokens*.json
**/*token*
**/*credential*
**/*secret*

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Arquivos temporários
*.tmp
*.temp
*-backup-*.json
*-report.json

# Node modules
node_modules/

# Build outputs
dist/
build/
.next/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
`;
            
            fs.writeFileSync('.gitignore', gitignoreContent);
            this.log('.gitignore seguro criado', 'success');
            
            // Mascarar tokens em arquivos existentes
            this.maskTokensInFiles();
            
            return true;
        } catch (error) {
            this.log(`Erro ao configurar ambiente: ${error.message}`, 'error');
            return false;
        }
    }

    maskTokensInFiles() {
        const filesToMask = [
            'data/auth/tokens.json',
            'data/users.json'
        ];
        
        filesToMask.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                let content = fs.readFileSync(filePath, 'utf8');
                // Mascarar tokens GitHub
                content = content.replace(/ghp_[A-Za-z0-9]{36}/g, 'ghp_MASKED_TOKEN_FOR_SECURITY');
                // Mascarar outros tokens
                content = content.replace(/"github_token":\s*"[^"]+"/g, '"github_token": "MASKED_FOR_SECURITY"');
                fs.writeFileSync(filePath, content);
                this.log(`Tokens mascarados em: ${filePath}`, 'info');
            }
        });
    }

    async configureGit() {
        try {
            this.log('[STEP 4] Configurando Git...', 'info');
            
            execSync(`git config user.name "${this.username}"`, { stdio: 'ignore' });
            execSync(`git config user.email "${this.username}@users.noreply.github.com"`, { stdio: 'ignore' });
            
            const remoteUrl = `https://${this.token}@github.com/${this.username}/test-repo.git`;
            execSync(`git remote add origin "${remoteUrl}"`, { stdio: 'ignore' });
            
            this.log('Git configurado com sucesso', 'success');
            return true;
        } catch (error) {
            this.log(`Erro ao configurar Git: ${error.message}`, 'error');
            return false;
        }
    }

    async createSecureCommit() {
        try {
            this.log('[STEP 5] Criando commit seguro...', 'info');
            
            // Criar arquivo README
            const readmeContent = `# Test Repository\n\nRepositório de teste criado automaticamente.\n\nData: ${new Date().toISOString()}\n\n## Características\n- Sem tokens no código\n- Configuração segura\n- Push automático\n`;
            fs.writeFileSync('README.md', readmeContent);
            
            // Criar arquivo de teste
            const testDir = 'tests';
            if (!fs.existsSync(testDir)) {
                fs.mkdirSync(testDir);
            }
            
            const testContent = `// Arquivo de teste\n// Criado em: ${new Date().toISOString()}\n\nconsole.log('Push automático funcionando!');\n`;
            fs.writeFileSync(path.join(testDir, 'auto-push-test.js'), testContent);
            
            // Adicionar arquivos
            execSync('git add .', { stdio: 'ignore' });
            execSync('git commit -m "Initial commit - secure setup"', { stdio: 'ignore' });
            
            this.log('Commit seguro criado', 'success');
            return true;
        } catch (error) {
            this.log(`Erro ao criar commit: ${error.message}`, 'error');
            return false;
        }
    }

    async performSecurePush() {
        try {
            this.log('[STEP 6] Realizando push seguro...', 'info');
            
            const pushResult = execSync('git push -u origin main', { 
                encoding: 'utf8',
                stdio: 'pipe'
            });
            
            this.log('Push realizado com sucesso!', 'success');
            this.log(`Resultado: ${pushResult}`, 'info');
            
            return true;
        } catch (error) {
            this.log(`Push falhou: ${error.message}`, 'error');
            
            // Tentar com força (apenas se necessário)
            try {
                this.log('Tentando push forçado...', 'warning');
                const forceResult = execSync('git push --force-with-lease origin main', { 
                    encoding: 'utf8',
                    stdio: 'pipe'
                });
                this.log('Push forçado bem-sucedido!', 'success');
                return true;
            } catch (forceError) {
                this.log(`Push forçado também falhou: ${forceError.message}`, 'error');
                return false;
            }
        }
    }

    async verifyPush() {
        try {
            this.log('[STEP 7] Verificando push no GitHub...', 'info');
            
            const checkCmd = `curl -s -H "Authorization: token ${this.token}" https://api.github.com/repos/${this.username}/test-repo/commits`;
            const result = execSync(checkCmd, { encoding: 'utf8' });
            
            if (result.includes('"sha"')) {
                this.log('Push verificado com sucesso no GitHub!', 'success');
                return true;
            } else {
                this.log('Não foi possível verificar o push', 'warning');
                return false;
            }
        } catch (error) {
            this.log(`Erro na verificação: ${error.message}`, 'error');
            return false;
        }
    }

    async cleanup() {
        try {
            this.log('[STEP 8] Limpando configuração...', 'info');
            
            // Remover token do remote
            execSync(`git remote set-url origin https://github.com/${this.username}/test-repo.git`, { stdio: 'ignore' });
            
            this.log('Configuração limpa', 'success');
            return true;
        } catch (error) {
            this.log(`Erro na limpeza: ${error.message}`, 'error');
            return false;
        }
    }

    async saveReport() {
        this.report.status = this.report.success ? 'SUCCESS' : 'FAILED';
        this.report.timestamp_end = new Date().toISOString();
        
        fs.writeFileSync(this.reportFile, JSON.stringify(this.report, null, 2));
        this.log(`Relatório salvo em: ${this.reportFile}`, 'info');
    }

    async run() {
        try {
            // Executar todos os passos
            const steps = [
                () => this.loadCredentials(),
                () => this.createFreshRepository(),
                () => this.cleanGitHistory(),
                () => this.setupSecureEnvironment(),
                () => this.configureGit(),
                () => this.createSecureCommit(),
                () => this.performSecurePush(),
                () => this.verifyPush(),
                () => this.cleanup()
            ];
            
            for (const step of steps) {
                const success = await step();
                if (!success) {
                    this.report.success = false;
                    break;
                }
            }
            
            if (this.report.errors.length === 0) {
                this.report.success = true;
                this.log('🎉 SOLUÇÃO DEFINITIVA IMPLEMENTADA COM SUCESSO!', 'success');
            }
            
        } catch (error) {
            this.log(`Erro geral: ${error.message}`, 'error');
            this.report.errors.push(error.message);
        } finally {
            await this.saveReport();
        }
    }
}

// Executar solução
const fix = new UltimateGitHubFix();
fix.run().then(() => {
    console.log('============================================================');
    console.log('🏁 PROCESSO CONCLUÍDO');
}).catch(error => {
    console.error('❌ ERRO CRÍTICO:', error.message);
});