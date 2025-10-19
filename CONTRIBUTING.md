# Contributing to AI Health Assistant (AHA)

Thank you for considering contributing to AHA! We welcome contributions from developers, healthcare professionals, linguists, and anyone passionate about improving healthcare accessibility in rural India.

## 🌟 How to Contribute

### 1. Code Contributions

#### Getting Started
```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR-USERNAME/AI-Health-Assistant-AHA.git
cd AI-Health-Assistant-AHA

# Install dependencies
npm install

# Create a feature branch
git checkout -b feature/your-feature-name
```

#### Development Workflow
1. **Make your changes** following our coding standards
2. **Test thoroughly** using provided test scripts
3. **Document your changes** in code comments and README if needed
4. **Commit with clear messages** following conventional commits
5. **Push to your fork** and create a Pull Request

#### Code Standards
- **ES6+ JavaScript**: Use modern JavaScript features
- **Async/Await**: Prefer async/await over callbacks
- **Error Handling**: Always include try-catch blocks
- **Comments**: Document complex logic and medical terminology
- **Formatting**: Use 2 spaces for indentation, semicolons required

### 2. Language Translations

We're actively seeking contributors to expand language support!

#### Current Languages
- English ✅
- Hindi (हिंदी) ✅
- Telugu (తెలుగు) ✅
- Tamil (தமிழ்) ✅
- Odia (ଓଡ଼ିଆ) ✅

#### Adding a New Language
1. Open `src/utils/languageUtils.js`
2. Add translations to the `translations` object
3. Include both native script and transliteration
4. Test with real users from that linguistic region
5. Submit PR with language code (ISO 639-1)

**Important**: Medical terminology must be accurate. Consult healthcare professionals for verification.

### 3. Documentation

Help us improve documentation:
- **Setup Guides**: Simplify installation steps
- **API Documentation**: Document endpoints and services
- **User Guides**: Create tutorials for different user personas
- **Troubleshooting**: Add common issues and solutions
- **Code Comments**: Improve inline documentation

### 4. Testing

Enhance test coverage:
- **Unit Tests**: Test individual functions and services
- **Integration Tests**: Test feature workflows
- **Language Tests**: Verify multilingual accuracy
- **Edge Cases**: Test error handling and unusual inputs

Run tests:
```bash
# Run all tests
npm test

# Test specific feature
node scripts/test-multilingual-accuracy.js
node scripts/test-disease-outbreak-system.js
```

### 5. Bug Reports

Found a bug? Help us fix it!

**Before Submitting**:
- Check if the issue already exists
- Test on latest version
- Gather relevant logs and screenshots

**Submit Issue**:
```markdown
**Bug Description**: Clear description of the issue

**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Behavior**: What should happen

**Actual Behavior**: What actually happens

**Environment**:
- Node.js version: 
- OS: 
- WhatsApp API version:

**Logs**: Paste relevant error logs
```

### 6. Feature Requests

Have an idea? We'd love to hear it!

**Feature Request Template**:
```markdown
**Feature Title**: Brief descriptive title

**Problem Statement**: What problem does this solve?

**Proposed Solution**: How would this feature work?

**Use Cases**: Who benefits and how?

**Alternatives Considered**: Other solutions you've thought about

**Additional Context**: Screenshots, mockups, references
```

## 🎯 Priority Areas

We especially welcome contributions in these areas:

### High Priority
- 🌐 **Regional Language Support**: Kannada, Malayalam, Bengali, Marathi
- 🏥 **Healthcare Provider Integration**: PHC/CHC database connectivity
- 📊 **Analytics Dashboard**: Usage metrics and impact measurement
- 🔊 **Voice Support**: Audio message processing and responses
- 📱 **Offline Capabilities**: SMS fallback for WhatsApp outages

### Medium Priority
- 🧪 **Test Coverage**: Increase to 90%+ coverage
- 📖 **Video Tutorials**: User onboarding and feature guides
- 🎨 **Template Messages**: Pre-designed health education content
- 🔔 **Smart Notifications**: Context-aware health reminders
- 🗺️ **Location Services**: Nearby healthcare facility finder

### Nice to Have
- 🤝 **Community Features**: Health discussion groups
- 📈 **Predictive Analytics**: Disease outbreak forecasting
- 🎓 **Health Education**: Interactive learning modules
- 🏆 **Gamification**: Health goal tracking and rewards

## 📝 Pull Request Guidelines

### Before Submitting
- ✅ Code follows project style guidelines
- ✅ All tests pass (`npm test`)
- ✅ Documentation updated if needed
- ✅ Commit messages are clear and descriptive
- ✅ Branch is up to date with main

### PR Template
```markdown
**Description**
Brief description of changes

**Type of Change**
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

**Testing**
- [ ] Tested locally
- [ ] Added new tests
- [ ] All existing tests pass

**Screenshots** (if applicable)
Attach relevant screenshots

**Related Issues**
Fixes #123, Relates to #456

**Checklist**
- [ ] My code follows project style
- [ ] I have commented complex code
- [ ] Documentation is updated
- [ ] No breaking changes
```

### Review Process
1. Automated tests run automatically
2. Maintainers review code within 48 hours
3. Address feedback and requested changes
4. Once approved, PR will be merged
5. Your contribution will be acknowledged!

## 🏆 Recognition

All contributors will be:
- Added to CONTRIBUTORS.md
- Mentioned in release notes
- Acknowledged in project documentation
- Invited to our contributors channel

## 🤔 Questions?

Need help or have questions?
- 💬 Join our Discord community (link)
- 📧 Email: contributors@aha-bot.com
- 📖 Check [documentation](docs/)
- 💡 Open a discussion on GitHub

## 🚫 Code of Conduct

### Our Pledge
We are committed to providing a welcoming and inclusive experience for everyone.

### Standards
**Expected Behavior**:
- Use welcoming and inclusive language
- Be respectful of differing viewpoints
- Accept constructive criticism gracefully
- Focus on what's best for the community
- Show empathy towards others

**Unacceptable Behavior**:
- Harassment or discrimination
- Trolling or insulting comments
- Personal or political attacks
- Publishing private information
- Any unprofessional conduct

### Enforcement
Violations will result in:
1. **Warning**: First offense
2. **Temporary Ban**: Repeated violations
3. **Permanent Ban**: Severe or persistent violations

Report violations to: conduct@aha-bot.com

## 📜 License

By contributing, you agree that your contributions will be licensed under the project's MIT License.

## 🙏 Thank You!

Your contributions make a real difference in improving healthcare accessibility for millions of people in rural India. Together, we're building something meaningful!

---

**Questions?** Feel free to ask in [GitHub Discussions](https://github.com/K007-K/AI-Health-Assistant-AHA/discussions)

**Ready to contribute?** Check out [good first issues](https://github.com/K007-K/AI-Health-Assistant-AHA/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)
