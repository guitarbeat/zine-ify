import re

with open('tests/unit/export_service.spec.js', 'r') as f:
    content = f.read()

# Let's fix the nitpick - duplicate afterEach blocks.
# There's likely an extra afterEach block from previous patching
content = re.sub(r'  test\.afterEach\(\(\) => \{\n    if \(global\.window\) delete global\.window;\n  \}\);\n', '', content)

# And add just one at the end of the describe block before the final });
content = content.replace("});\n", "  test.afterEach(() => {\n    if (global.window) delete global.window;\n  });\n});\n", 1)

with open('tests/unit/export_service.spec.js', 'w') as f:
    f.write(content)
