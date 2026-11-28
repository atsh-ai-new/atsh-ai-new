#!/bin/sh
set -eu
rt=/opt/replica/runtime
lib=/opt/replica/libc/usr/lib/x86_64-linux-gnu
export GGML_BACKEND_PATH="$rt/libggml-cpu-haswell.so"
exec "$lib/ld-linux-x86-64.so.2" --library-path "$lib:$rt" "$rt/audiocpp_cli" "$@"
