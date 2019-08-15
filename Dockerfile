FROM bitwalker/alpine-elixir-phoenix:1.9.0

RUN apk --no-cache --update add alpine-sdk gmp-dev automake libtool inotify-tools autoconf python

EXPOSE 4000

#ENV DFLAGS="-L/usr/local/opt/openssl/lib"
#ENV CPPFLAGS="-I/usr/local/opt/openssl/include"

ENV PORT=4000 \
    MIX_ENV="prod" \
    SECRET_KEY_BASE="RMgI4C1HSkxsEjdhtGMfwAHfyT6CKWXOgzCboJflfSm4jeAlic52io05KB6mqzc5"


# Cache elixir deps
ADD mix.exs mix.lock ./
ADD apps/block_scout_web/mix.exs ./apps/block_scout_web/
ADD apps/explorer/mix.exs ./apps/explorer/
ADD apps/ethereum_jsonrpc/mix.exs ./apps/ethereum_jsonrpc/
ADD apps/indexer/mix.exs ./apps/indexer/

#RUN mix deps.update keccakf1600
RUN mix deps.clean keccakf1600
RUN HEX_HTTP_CONCURRENCY=4 HEX_HTTP_TIMEOUT=120 mix do deps.get, deps.compile

ADD . .

ARG COIN
RUN if [ "$COIN" != "" ]; then sed -i s/"POA"/"${COIN}"/g apps/block_scout_web/priv/gettext/en/LC_MESSAGES/default.po; fi

# Run forderground build and phoenix digest
RUN mix compile

# Add blockscout npm deps
RUN cd apps/block_scout_web/assets/ && \
    npm install && \
    npm run deploy && \
    cd -

RUN cd apps/explorer/ && \
    npm install && \
    apk update && apk del --force-broken-world alpine-sdk gmp-dev automake libtool inotify-tools autoconf python

#FROM blockscout

#WORKDIR /opt/app

ADD start_explorer.sh .
RUN chmod +x start_explorer.sh
CMD ./start_explorer.sh


# RUN mix do ecto.drop --force, ecto.create, ecto.migrate

# USER default

# CMD ["mix", "phx.server"]
