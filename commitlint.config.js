export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      [
        'algorithms',
        'layout',
        'graphty-element',
        'graphty',
        'gpu-3d-force-layout',
        'deps',
        'release',
        'ci',
        'docs',
        'tools',
        'workspace'
      ]
    ]
  }
};
