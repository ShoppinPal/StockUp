#!/bin/sh
# This script is used to read the .env file and setup the enviroment variables for local testing

echo "###"
echo Its best to invoke this script as: '. ./setenv.sh' rather than './setenv.sh'
echo "###"

while read kv
do
    key=${kv%%=*}
    val=${kv#*=}
    echo export $key="$val"
    export $key="$val"
done < ".env"

echo "###"
echo Its best to invoke this script as: '. ./setenv.sh' rather than './setenv.sh'
echo "###"