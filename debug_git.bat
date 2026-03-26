@echo off
git branch --show-current > tmp_git_branch.txt
git status >> tmp_git_branch.txt
git log -n 1 --oneline >> tmp_git_branch.txt
