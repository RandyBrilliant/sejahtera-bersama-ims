#!/bin/bash
# Install AWS CLI v2 from the official AWS bundle (works on Ubuntu 22.04/24.04+).
# Ubuntu 24.04 removed the apt "awscli" package — use this instead of apt-get install awscli.

install_aws_cli_v2() {
    if command -v aws >/dev/null 2>&1; then
        echo "AWS CLI already installed: $(aws --version 2>&1)"
        return 0
    fi

    local arch url tmpdir
    arch="$(uname -m)"
    case "$arch" in
        x86_64|amd64)
            url="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
            ;;
        aarch64|arm64)
            url="https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip"
            ;;
        *)
            echo "Unsupported CPU architecture for AWS CLI v2: $arch" >&2
            return 1
            ;;
    esac

    if ! command -v curl >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
        if [ "$EUID" -ne 0 ]; then
            echo "curl and unzip are required. Run: sudo apt-get install -y curl unzip" >&2
            return 1
        fi
        apt-get update -qq
        apt-get install -y -qq curl unzip
    fi

    tmpdir="$(mktemp -d)"
    trap 'rm -rf "$tmpdir"' RETURN

    echo "Downloading AWS CLI v2 ($arch)..."
    curl -fsSL "$url" -o "$tmpdir/awscliv2.zip"
    unzip -q "$tmpdir/awscliv2.zip" -d "$tmpdir"

    if [ "$EUID" -eq 0 ]; then
        "$tmpdir/aws/install" --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli
    elif command -v sudo >/dev/null 2>&1; then
        sudo "$tmpdir/aws/install" --bin-dir /usr/local/bin --install-dir /usr/local/aws-cli
    else
        echo "Root or sudo required to install AWS CLI to /usr/local/bin" >&2
        return 1
    fi

    if ! command -v aws >/dev/null 2>&1; then
        echo "AWS CLI install finished but 'aws' is not in PATH" >&2
        return 1
    fi

    echo "AWS CLI installed: $(aws --version 2>&1)"
}
