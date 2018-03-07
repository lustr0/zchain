#!/bin/sh

export GOPATH=$(pwd)
export PATH=$GOPATH/bin:$PATH

echo "Building @ GOPATH ${GOPATH}"

glide install

mv vendor src/github.com/lustro/zchain-api

go build -o bin/zchain github.com/lustro/zchain-api

CODE=$?

mv src/github.com/lustro/zchain-api/vendor .

exit $CODE
