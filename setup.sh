mkdir -p docker/volumes/mongo
docker-compose run admin npm install
docker-compose run web npm install --no-optional
docker-compose run worker2 npm install --no-optional
docker-compose run notification npm install

docker-compose run web npm run angular2-sdk

