#!/bin/bash
go build -o pocketbase main.go && chmod +x ./pocketbase && docker restart monk_house
