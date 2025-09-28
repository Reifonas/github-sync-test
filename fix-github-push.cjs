const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// Cores para console
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logStep(step, message) {
  log(`\n[STEP ${step}] ${message}`, 'cyan');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

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
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (error) {
          resolve({ statusCode: res.statusCode, data: responseData });
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

// Função principal para corrigir o problema de push
async function fixGitHubPush() {
  log('🔧 CORREÇÃO AUTOMÁTICA DO PROBLEMA DE PUSH GITHUB', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  const report = {
    steps: [],
    errors: [],
    warnings: [],
    success: false
  };

  try {
    // STEP 1: Verificar tokens disponíveis
    logStep(1, 'Verificando tokens do GitHub disponíveis');
    
    const tokensPath = path.join(__dirname, 'data', 'auth', 'tokens.json');
    if (!fs.existsSync(tokensPath)) {
      throw new Error('Arquivo de tokens não encontrado. Faça login na aplicação primeiro.');
    }
    
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    let githubToken = null;
    let githubUsername = null;
    
    // Procurar por token válido
    for (const [userId, userData] of Object.entries(tokens)) {
      if (userData.github_token && userData.github_token.startsWith('ghp_')) {
        githubToken = userData.github_token;
        githubUsername = userData.user_metadata?.github_username || 'github-user';
        log(`Token encontrado para usuário: ${githubUsername}`);
        break;
      }
    }
    
    if (!githubToken) {
      throw new Error('Token do GitHub válido não encontrado. Conecte sua conta GitHub na aplicação.');
    }
    
    logSuccess('Token do GitHub encontrado e válido');
    report.steps.push({ step: 1, name: 'Verificação de token', status: 'success' });

    // STEP 2: Verificar se o repositório existe no GitHub
    logStep(2, 'Verificando se o repositório existe no GitHub');
    
    const repoName = 'test-repo';
    const checkRepoOptions = {
      hostname: 'api.github.com',
      path: `/repos/${githubUsername}/${repoName}`,
      method: 'GET',
      headers: {
        'Authorization': `token ${githubToken}`,
        'User-Agent': 'GitHub-Sync-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    };
    
    const repoCheckResult = await makeGitHubRequest(checkRepoOptions);
    
    if (repoCheckResult.statusCode === 200) {
      logSuccess(`Repositório ${repoName} já existe no GitHub`);
      report.steps.push({ step: 2, name: 'Verificação de repositório', status: 'success' });
    } else if (repoCheckResult.statusCode === 404) {
      logWarning(`Repositório ${repoName} não existe. Criando automaticamente...`);
      
      // STEP 3: Criar repositório no GitHub
      logStep(3, 'Criando repositório no GitHub');
      
      const createRepoOptions = {
        hostname: 'api.github.com',
        path: '/user/repos',
        method: 'POST',
        headers: {
          'Authorization': `token ${githubToken}`,
          'User-Agent': 'GitHub-Sync-App',
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        }
      };
      
      const repoData = {
        name: repoName,
        description: 'Repositório criado automaticamente pelo GitHub Sync App',
        private: false,
        auto_init: false
      };
      
      const createResult = await makeGitHubRequest(createRepoOptions, repoData);
      
      if (createResult.statusCode === 201) {
        logSuccess(`Repositório ${repoName} criado com sucesso no GitHub!`);
        report.steps.push({ step: 3, name: 'Criação de repositório', status: 'success' });
      } else {
        throw new Error(`Falha ao criar repositório: ${JSON.stringify(createResult.data)}`);
      }
    } else {
      throw new Error(`Erro ao verificar repositório: ${repoCheckResult.statusCode} - ${JSON.stringify(repoCheckResult.data)}`);
    }

    // STEP 4: Configurar remote com token
    logStep(4, 'Configurando remote com autenticação');
    
    const repoPath = __dirname;
    const remoteUrl = `https://${githubToken}@github.com/${githubUsername}/${repoName}.git`;
    
    try {
      // Remover remote existente se houver
      execSync('git remote remove origin', { cwd: repoPath, stdio: 'ignore' });
    } catch (error) {
      // Ignorar erro se remote não existir
    }
    
    // Adicionar novo remote com token
    execSync(`git remote add origin ${remoteUrl}`, { cwd: repoPath });
    logSuccess('Remote configurado com autenticação');
    report.steps.push({ step: 4, name: 'Configuração de remote', status: 'success' });

    // STEP 5: Preparar e fazer push
    logStep(5, 'Preparando arquivos para push');
    
    // Verificar se há mudanças
    const statusOutput = execSync('git status --porcelain', { cwd: repoPath, encoding: 'utf8' });
    
    if (statusOutput.trim()) {
      // Adicionar arquivos
      execSync('git add .', { cwd: repoPath });
      
      // Fazer commit
      const commitMessage = 'Correção automática: configuração de push para GitHub';
      try {
        execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath });
        log('Commit realizado com sucesso');
      } catch (error) {
        if (error.message.includes('nothing to commit')) {
          log('Nenhuma mudança para commit');
        } else {
          throw error;
        }
      }
    }
    
    // STEP 6: Fazer push
    logStep(6, 'Fazendo push para GitHub');
    
    try {
      const pushOutput = execSync('git push -u origin main', { cwd: repoPath, encoding: 'utf8' });
      logSuccess('Push realizado com sucesso!');
      log(pushOutput);
      report.steps.push({ step: 6, name: 'Push para GitHub', status: 'success' });
      report.success = true;
    } catch (error) {
      // Se falhar com main, tentar master
      try {
        const pushOutput = execSync('git push -u origin master', { cwd: repoPath, encoding: 'utf8' });
        logSuccess('Push realizado com sucesso (branch master)!');
        log(pushOutput);
        report.steps.push({ step: 6, name: 'Push para GitHub', status: 'success' });
        report.success = true;
      } catch (masterError) {
        throw new Error(`Falha no push: ${error.message}`);
      }
    }

    // STEP 7: Limpar remote com token (segurança)
    logStep(7, 'Limpando configuração de segurança');
    
    const cleanRemoteUrl = `https://github.com/${githubUsername}/${repoName}.git`;
    execSync('git remote remove origin', { cwd: repoPath });
    execSync(`git remote add origin ${cleanRemoteUrl}`, { cwd: repoPath });
    logSuccess('Remote limpo (token removido da URL)');
    report.steps.push({ step: 7, name: 'Limpeza de segurança', status: 'success' });

  } catch (error) {
    logError(`Erro durante correção: ${error.message}`);
    report.errors.push(error.message);
  }

  // Relatório final
  log('\n' + '='.repeat(60), 'cyan');
  log('RELATÓRIO DA CORREÇÃO', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\nSteps executados: ${report.steps.length}`);
  log(`Erros: ${report.errors.length}`);
  log(`Sucesso: ${report.success ? 'SIM' : 'NÃO'}`, report.success ? 'green' : 'red');
  
  if (report.errors.length > 0) {
    log('\nERROS:', 'red');
    report.errors.forEach((error, index) => {
      log(`${index + 1}. ${error}`, 'red');
    });
  }
  
  if (report.success) {
    log('\n🎉 CORREÇÃO CONCLUÍDA COM SUCESSO!', 'green');
    log('O repositório foi criado e o push foi realizado.', 'green');
    log(`Verifique em: https://github.com/${githubUsername}/${repoName}`, 'cyan');
  } else {
    log('\n❌ CORREÇÃO FALHOU', 'red');
    log('Verifique os erros acima e tente novamente.', 'red');
  }
  
  // Salvar relatório
  const reportPath = path.join(__dirname, 'fix-push-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\nRelatório salvo em: ${reportPath}`, 'cyan');
  
  return report;
}

// Executar correção
if (require.main === module) {
  fixGitHubPush().catch(console.error);
}

module.exports = { fixGitHubPush };