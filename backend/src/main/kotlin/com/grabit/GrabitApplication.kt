package com.grabit

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class GrabitApplication

fun main(args: Array<String>) {
    runApplication<GrabitApplication>(*args)
}
