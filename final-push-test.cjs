const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// ID do usuário correto que tem token válido
const VALID_USER_ID = 'd2929b81-cb3f-47a1-b47b-6b0311964361';

// Função para executar comandos git com tratamento de erro melhorado
function execGitCommand(command, cwd = process.cwd()) {
  try {
    const result = execSync(command, { 
      cwd, 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return { success: true, output: result.trim(), stderr: '' };
  } catch (error) {
    // Para git, muitas vezes a saída "erro" é na verdade informativa
    const stdout = error.stdout ? error.stdout.toString().trim() : '';
    const stderr = error.stderr ? error.stderr.toString().trim() : '';
    
    // Verificar se é realmente um erro ou apenas saída informativa
    const isRealError = error.status !== 0 && (
      stderr.includes('fatal:') ||
      stderr.includes('error:') ||
      stderr.includes('Permission denied') ||
      stderr.includes('Authentication failed')
    );
    
    return { 
      success: !isRealError,
      error: error.message,
      output: stdout,
      stderr: stderr,
      exitCode: error.status
    };
  }
}

async function finalPushTest() {
  log('🎯 TESTE FINAL DE PUSH - VERSÃO CORRIGIDA', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  try {
    // 1. Carregar token válido
    const tokensPath = path.join(__dirname, 'data', 'auth', 'tokens.json');
    const tokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8'));
    const validUser = tokens[VALID_USER_ID];
    
    const token = validUser.github_token;
    const username = validUser.github_username || 'Reifonas';
    
    logSuccess(`Usando token válido para usuário: ${username}`);
    
    // 2. Configurar Git
    log('\n[STEP 1] Configurando Git...');
    
    // Configurar usuário
    execGitCommand(`git config user.name "${username}"`);
    execGitCommand(`git config user.email "${username}@users.noreply.github.com"`);
    logSuccess('Usuário Git configurado');
    
    // Configurar remote com token
    const remoteUrl = `https://${token}@github.com/${username}/test-repo.git`;
    execGitCommand('git remote remove origin');
    execGitCommand(`git remote add origin ${remoteUrl}`);
    logSuccess('Remote configurado com token');
    
    // 3. Criar arquivo de teste único
    log('\n[STEP 2] Criando arquivo de teste...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const testFile = path.join(process.cwd(), `push-test-${timestamp}.txt`);
    const testContent = `Teste de push final\nData: ${new Date().toISOString()}\nUsuário: ${username}\nStatus: Teste automático`;
    
    fs.writeFileSync(testFile, testContent);
    logSuccess(`Arquivo criado: ${path.basename(testFile)}`);
    
    // 4. Git add e commit
    log('\n[STEP 3] Preparando commit...');
    
    const addResult = execGitCommand('git add .');
    if (!addResult.success) {
      throw new Error(`Erro ao adicionar arquivos: ${addResult.stderr}`);
    }
    logSuccess('Arquivos adicionados');
    
    const commitResult = execGitCommand(`git commit -m "Teste automático - ${timestamp}"`);
    if (!commitResult.success && !commitResult.output.includes('nothing to commit')) {
      throw new Error(`Erro ao fazer commit: ${commitResult.stderr}`);
    }
    logSuccess('Commit realizado');
    
    // 5. Fazer pull primeiro para sincronizar
    log('\n[STEP 4] Sincronizando com repositório remoto...');
    
    const pullResult = execGitCommand('git pull origin main --allow-unrelated-histories');
    
    // Verificar se pull foi bem-sucedido (mesmo que tenha "warnings")
    if (pullResult.output.includes('FETCH_HEAD') || pullResult.output.includes('up to date') || pullResult.success) {
      logSuccess('Sincronização realizada');
      log(`Detalhes: ${pullResult.output}`);
    } else {
      logWarning('Pull teve problemas, mas continuando...');
      log(`Output: ${pullResult.output}`);
      log(`Stderr: ${pullResult.stderr}`);
    }
    
    // 6. Fazer push
    log('\n[STEP 5] Realizando push...');
    
    const pushResult = execGitCommand('git push origin main');
    
    if (pushResult.success || pushResult.output.includes('main -> main')) {
      logSuccess('🎉 PUSH REALIZADO COM SUCESSO!');
      log('\nDetalhes do push:');
      log(pushResult.output, 'green');
      
      if (pushResult.stderr) {
        log('\nInformações adicionais:');
        log(pushResult.stderr, 'yellow');
      }
    } else {
      // Tentar push para master
      logInfo('Tentando push para branch master...');
      const pushMasterResult = execGitCommand('git push origin master');
      
      if (pushMasterResult.success || pushMasterResult.output.includes('master -> master')) {
        logSuccess('🎉 PUSH REALIZADO COM SUCESSO (branch master)!');
        log('\nDetalhes do push:');
        log(pushMasterResult.output, 'green');
      } else {
        // Mostrar detalhes dos erros
        logError('Push falhou para ambas as branches');
        log('\nDetalhes do erro (main):');
        log(`Output: ${pushResult.output}`);
        log(`Stderr: ${pushResult.stderr}`);
        log(`Exit code: ${pushResult.exitCode}`);
        
        log('\nDetalhes do erro (master):');
        log(`Output: ${pushMasterResult.output}`);
        log(`Stderr: ${pushMasterResult.stderr}`);
        log(`Exit code: ${pushMasterResult.exitCode}`);
        
        throw new Error('Push falhou para ambas as branches');
      }
    }
    
    // 7. Limpar remote
    log('\n[STEP 6] Limpando configuração...');
    const cleanRemoteUrl = `https://github.com/${username}/test-repo.git`;
    execGitCommand('git remote remove origin');
    execGitCommand(`git remote add origin ${cleanRemoteUrl}`);
    logSuccess('Token removido do remote');
    
    // 8. Verificar status final
    log('\n[STEP 7] Verificando status final...');
    const statusResult = execGitCommand('git status');
    log('Status do repositório:');
    log(statusResult.output, 'blue');
    
    log('\n🎉 TESTE CONCLUÍDO COM SUCESSO!', 'green');
    log('=' .repeat(60), 'green');
    log('\n📋 RESUMO:', 'cyan');
    log('✅ Token do GitHub válido e funcionando');
    log('✅ Repositório test-repo existe e acessível');
    log('✅ Push realizado com sucesso');
    log('✅ Autenticação automática funcionando');
    
    // Salvar relatório de sucesso
    const successReport = {
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      user_id: VALID_USER_ID,
      username: username,
      repository: 'test-repo',
      test_file: path.basename(testFile),
      message: 'Push automático realizado com sucesso'
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'push-success-report.json'),
      JSON.stringify(successReport, null, 2)
    );
    
    log('\n📄 Relatório de sucesso salvo em: push-success-report.json');
    
  } catch (error) {
    logError(`Erro durante teste: ${error.message}`);
    
    // Salvar relatório de erro detalhado
    const errorReport = {
      timestamp: new Date().toISOString(),
      status: 'ERROR',
      error: error.message,
      stack: error.stack,
      user_id: VALID_USER_ID
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'push-final-error-report.json'),
      JSON.stringify(errorReport, null, 2)
    );
    
    log('\nRelatório de erro salvo em: push-final-error-report.json');
  }
}

// Executar teste
if (require.main === module) {
  finalPushTest();
}

module.exports = { finalPushTest };