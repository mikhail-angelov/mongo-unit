# Release flow: bump version, commit, tag, push.
# GitHub Actions (.github/workflows/publish.yml) then publishes to npm via OIDC.
# No npm tokens are used anywhere.
#
#   make release            # patch: 3.5.0 -> 3.5.1
#   make release BUMP=minor # 3.5.0 -> 3.6.0
#   make release BUMP=major # 3.5.0 -> 4.0.0
#
# Requires a clean working tree (commit your changes first).

BUMP ?= patch

.PHONY: release test

test:
	npm test

release:
	npm version $(BUMP) --tag-version-prefix=""
	git push origin HEAD --follow-tags
