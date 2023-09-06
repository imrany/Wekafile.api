all: clean build  
# .DEFAULT_GOAL:=build
# .PHONY: build copy 
# variable
B= npm

build: 
	@echo 'building app...'
	npx tsc

clean:
	@echo 'removing build dir..'
	rm -rf ./build

dev:
	@echo 'starting dev server'
	${B} run dev

copy:
	@echo 'copying views to build dir...'
	cp -r ./views ./build