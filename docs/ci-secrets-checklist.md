# CI/CD Secrets Checklist

## Required Secrets

### GitHub Actions (Repository Settings → Secrets and variables → Actions)

Currently, no secrets are required for the E2E test pipeline as it uses:
- Test data factories (no real user data)
- Local development server (no external API keys)
- Open-source dependencies only

## Optional Secrets for Enhanced Features

### Slack Notifications (Optional)
Add to repository secrets:

| Secret Name | Description | Where to Get |
|-------------|-------------|---------------|
| `SLACK_WEBHOOK` | Incoming webhook URL for test failure notifications | Create Slack App → Incoming Webhooks |

**Usage**: Uncomment Slack notification in `.github/workflows/test.yml`

### External Service Integration (Future)
If adding external services:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `STAGING_API_KEY` | API key for staging environment | `stg_api_12345` |
| `PRODUCTION_API_KEY` | API key for production smoke tests | `prod_67890` |
| `BROWSERSTACK_ACCESS_KEY` | BrowserStack for cross-browser testing | `bs_access_xyz` |

## Environment Variables

### Required (Set in workflow file)
- `TEST_ENV` - Target environment (local/staging/production)
- `NODE_VERSION_FILE` - Path to Node version file (`.nvmrc`)

### Optional (Set in workflow file)
- `CI` - Set to `true` in CI environment
- `BASE_URL` - Application URL (overridden by environment config)

## Security Best Practices

### 1. Secret Management
- ✅ Use GitHub Secrets, not hardcoded values
- ✅ Restrict secret access to necessary workflows only
- ✅ Rotate secrets regularly (quarterly for production)
- ✅ Use least privilege principle

### 2. Artifact Security
- ✅ No sensitive data in test artifacts
- ✅ 30-day retention limit for failure artifacts
- ✅ Screenshots and traces may contain UI data (review before sharing)

### 3. Dependency Security
- ✅ Use `npm audit` for vulnerability scanning
- ✅ Pin dependency versions in package-lock.json
- ✅ Review third-party scripts in CI

## Configuration Steps

### Adding Slack Notifications

1. **Create Slack App**:
   - Go to https://api.slack.com/apps
   - Click "Create New App" → "From scratch"
   - Name: "Texo Test Notifications"
   - Workspace: Your team workspace

2. **Enable Incoming Webhooks**:
   - Go to "Incoming Webhooks" in sidebar
   - Click "Add New Webhook to Workspace"
   - Select channel (e.g., #dev-alerts)
   - Copy webhook URL

3. **Add to GitHub**:
   - Go to repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `SLACK_WEBHOOK`
   - Value: Paste webhook URL
   - Click "Add secret"

4. **Enable in Workflow**:
   ```yaml
   - name: Notify on failure
     if: failure()
     uses: 8398a7/action-slack@v3
     with:
       status: ${{ job.status }}
       text: 'Test failures detected in PR #${{ github.event.pull_request.number }}'
       webhook_url: ${{ secrets.SLACK_WEBHOOK }}
   ```

### Adding Environment-Specific Secrets

1. **Create Environment**:
   - Go to repository → Settings → Environments
   - Click "New environment"
   - Name: "staging" or "production"

2. **Add Secrets**:
   - Go to environment → Secrets
   - Add environment-specific secrets
   - Configure protection rules if needed

3. **Update Workflow**:
   ```yaml
   jobs:
     test-staging:
       environment: staging
       # ... job configuration
   ```

## Monitoring and Auditing

### Secret Usage Monitoring
- Check GitHub Actions logs for secret access
- Review secret usage monthly
- Audit webhook deliveries for Slack integration

### Artifact Review
- Download and review test artifacts periodically
- Ensure no sensitive data captured in screenshots
- Verify artifact retention policies are enforced

## Troubleshooting

### Common Secret Issues

**Issue**: "Secret not found" error
- **Solution**: Verify secret name matches exactly (case-sensitive)

**Issue**: Webhook not firing
- **Solution**: Check Slack app permissions and webhook URL

**Issue**: Environment variables not working
- **Solution**: Ensure `env:` section in workflow is properly formatted

### Debugging Secret Access

Add this step to workflow to debug (remove before committing):
```yaml
- name: Debug secrets (REMOVE BEFORE COMMIT)
  run: |
    echo "SLACK_WEBHOOK exists: ${{ secrets.SLACK_WEBHOOK != '' }}"
    echo "Environment: ${{ env.TEST_ENV }}"
```

## Compliance Notes

- ✅ No personal data in test artifacts
- ✅ Secrets encrypted at rest by GitHub
- ✅ Access logs maintained by GitHub
- ✅ Regular secret rotation recommended

## Emergency Procedures

### Secret Compromise
1. Immediately rotate compromised secret
2. Review GitHub Actions audit log
3. Revoke any external access (webhooks, API keys)
4. Notify team of potential impact

### Pipeline Failure
1. Check for secret expiration
2. Verify environment configuration
3. Review recent dependency changes
4. Fall back to manual testing if needed

---

**Last Updated**: 2025-11-22  
**Review Frequency**: Quarterly  
**Contact**: DevOps team for secret management issues