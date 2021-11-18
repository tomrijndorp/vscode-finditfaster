#!/bin/bash

# Join array without inserting a string when the array is empty
array_join() {
    if [[ $# -gt 0 ]]; then
        for arg in "$@"; do
            printf "'%s' " "${arg}"
        done
    fi
}