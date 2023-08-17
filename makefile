all: build copy 
# .DEFAULT_GOAL:=build
# .PHONY: build copy 
# variable
B= npm

build: 
	@echo 'building app...'
	rm -rf ./build&&npx tsc

clean:
	@echo 'removing build dir..'
	rm -rf ./build

dev:
	@echo 'starting dev server'
	${B} run dev

copy:
	@echo 'copying views to build dir...'
	cp -r ./views ./build

host:
	 @echo 'Finding device ip address...'
	 bash ./commands